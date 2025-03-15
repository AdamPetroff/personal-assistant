import { google } from "googleapis";
import { Readable } from "stream";
import { logger } from "../utils/logger";
import { GMAIL_CONFIG } from "../config/constants";
import { FileService } from "./fileService";

// Interface for email metadata
export interface EmailMetadata {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    internalDate: string;
    subject: string;
    from: string;
    to: string[];
    date: Date;
    hasAttachments: boolean;
}

// Interface for a complete email with content
export interface Email extends EmailMetadata {
    textContent: string;
    htmlContent: string;
    attachments: EmailAttachment[];
}

// Interface for email attachments
export interface EmailAttachment {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
    content?: Buffer;
}

export class GmailService {
    private readonly gmail;
    private readonly auth;
    private readonly fileService: FileService;

    constructor() {
        this.fileService = new FileService();

        // Setup OAuth2 client
        this.auth = new google.auth.OAuth2(GMAIL_CONFIG.clientId, GMAIL_CONFIG.clientSecret, GMAIL_CONFIG.redirectUri);

        // Set refresh token
        this.auth.setCredentials({
            refresh_token: GMAIL_CONFIG.refreshToken
        });

        // Initialize Gmail client
        this.gmail = google.gmail({ version: "v1", auth: this.auth });

        // Log configuration status
        if (!this.isConfigured()) {
            logger.warn("Gmail service initialized with incomplete configuration");
        } else {
            logger.info("Gmail service initialized successfully");
        }
    }

    /**
     * Check if the Gmail service is configured properly
     */
    public isConfigured(): boolean {
        return !!(GMAIL_CONFIG.clientId && GMAIL_CONFIG.clientSecret && GMAIL_CONFIG.refreshToken);
    }

    /**
     * Fetch a list of recent emails
     * @param maxResults Maximum number of emails to fetch
     * @param query Optional query string to filter emails
     * @returns List of email metadata
     */
    public async listEmails(maxResults: number = 10, query: string = ""): Promise<EmailMetadata[]> {
        try {
            if (!this.isConfigured()) {
                throw new Error("Gmail service is not properly configured");
            }

            // Build the search query
            let finalQuery = query;
            // if (!finalQuery.includes("is:unread") && !finalQuery.includes("is:read")) {
            //     // Default to unread messages if not specified
            //     finalQuery = `is:unread ${finalQuery}`.trim();
            // }

            // Fetch the list of messages
            const response = await this.gmail.users.messages.list({
                userId: "me",
                maxResults,
                q: finalQuery
            });

            const messages = response.data.messages || [];

            // If no messages found, return empty array
            if (messages.length === 0) {
                return [];
            }

            // Fetch details for each message
            const emailsMetadata: EmailMetadata[] = await Promise.all(
                messages.map(async (message) => {
                    if (!message.id) {
                        throw new Error("Message ID is undefined");
                    }

                    const messageDetails = await this.gmail.users.messages.get({
                        userId: "me",
                        id: message.id
                    });

                    const { id, threadId, labelIds, snippet, internalDate, payload } = messageDetails.data;

                    // Extract headers
                    const headers = payload?.headers || [];
                    const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
                    const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
                    const to = (headers.find((h) => h.name?.toLowerCase() === "to")?.value || "")
                        .split(",")
                        .map((email) => email.trim());
                    const date = new Date(headers.find((h) => h.name?.toLowerCase() === "date")?.value || "");

                    // Check if message has attachments
                    const hasAttachments = !!payload?.parts?.some((part) => part.filename && part.filename.length > 0);

                    return {
                        id: id || "",
                        threadId: threadId || "",
                        labelIds: labelIds || [],
                        snippet: snippet || "",
                        internalDate: internalDate || "",
                        subject,
                        from,
                        to,
                        date,
                        hasAttachments
                    };
                })
            );

            return emailsMetadata;
        } catch (error) {
            logger.error("Error fetching emails:", error);
            throw new Error(`Failed to fetch emails: ${error}`);
        }
    }

    /**
     * Fetch a specific email by ID
     * @param emailId The ID of the email to fetch
     * @returns Complete email with content and attachments
     */
    public async getEmail(emailId: string): Promise<Email> {
        try {
            if (!this.isConfigured()) {
                throw new Error("Gmail service is not properly configured");
            }

            // Fetch the message
            const message = await this.gmail.users.messages.get({
                userId: "me",
                id: emailId,
                format: "full"
            });

            const { id, threadId, labelIds, snippet, internalDate, payload } = message.data;

            if (!payload) {
                throw new Error("Email payload is undefined");
            }

            // Extract headers
            const headers = payload.headers || [];
            const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
            const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
            const to = (headers.find((h) => h.name?.toLowerCase() === "to")?.value || "")
                .split(",")
                .map((email) => email.trim());
            const date = new Date(headers.find((h) => h.name?.toLowerCase() === "date")?.value || "");

            // Extract content and attachments
            const { textContent, htmlContent, attachments } = await this.parseMessageParts(payload, emailId);

            return {
                id: id || "",
                threadId: threadId || "",
                labelIds: labelIds || [],
                snippet: snippet || "",
                internalDate: internalDate || "",
                subject,
                from,
                to,
                date,
                textContent,
                htmlContent,
                attachments,
                hasAttachments: attachments.length > 0
            };
        } catch (error) {
            logger.error(`Error fetching email ${emailId}:`, error);
            throw new Error(`Failed to fetch email: ${error}`);
        }
    }

    /**
     * Download the content of an attachment
     * @param emailId The ID of the email
     * @param attachmentId The ID of the attachment
     * @returns Buffer containing the attachment content
     */
    public async downloadAttachment(emailId: string, attachmentId: string): Promise<Buffer> {
        try {
            if (!this.isConfigured()) {
                throw new Error("Gmail service is not properly configured");
            }

            const attachment = await this.gmail.users.messages.attachments.get({
                userId: "me",
                messageId: emailId,
                id: attachmentId
            });

            const data = attachment.data.data;

            if (!data) {
                throw new Error("Attachment data is undefined");
            }

            // Convert base64 data to buffer
            return Buffer.from(data, "base64");
        } catch (error) {
            logger.error(`Error downloading attachment ${attachmentId} from email ${emailId}:`, error);
            throw new Error(`Failed to download attachment: ${error}`);
        }
    }

    /**
     * Save an attachment to disk or S3
     * @param emailId The ID of the email
     * @param attachmentId The ID of the attachment
     * @param filename The filename to save as
     * @param mimeType The MIME type of the attachment
     * @returns The file key or path where the attachment was saved
     */
    public async saveAttachment(
        emailId: string,
        attachmentId: string,
        filename: string,
        mimeType: string
    ): Promise<string> {
        try {
            const buffer = await this.downloadAttachment(emailId, attachmentId);

            // Use file service to save the attachment
            if (this.fileService.isConfigured()) {
                // Save to S3 if configured
                const result = await this.fileService.uploadBuffer(buffer, filename, mimeType);
                return result.fileKey;
            } else {
                // Otherwise save locally
                return await this.fileService.saveFile(buffer, filename);
            }
        } catch (error) {
            logger.error(`Error saving attachment ${attachmentId} from email ${emailId}:`, error);
            throw new Error(`Failed to save attachment: ${error}`);
        }
    }

    /**
     * Mark an email as read
     * @param emailId The ID of the email to mark as read
     */
    public async markAsRead(emailId: string): Promise<void> {
        try {
            if (!this.isConfigured()) {
                throw new Error("Gmail service is not properly configured");
            }

            await this.gmail.users.messages.modify({
                userId: "me",
                id: emailId,
                requestBody: {
                    removeLabelIds: ["UNREAD"]
                }
            });
        } catch (error) {
            logger.error(`Error marking email ${emailId} as read:`, error);
            throw new Error(`Failed to mark email as read: ${error}`);
        }
    }

    /**
     * Parse message parts to extract content and attachments
     * @param payload The message payload
     * @param emailId The email ID
     * @returns Extracted text content, HTML content, and attachments
     */
    private async parseMessageParts(
        payload: any,
        emailId: string
    ): Promise<{
        textContent: string;
        htmlContent: string;
        attachments: EmailAttachment[];
    }> {
        let textContent = "";
        let htmlContent = "";
        const attachments: EmailAttachment[] = [];

        // Handle case when there are no parts (simple email)
        if (!payload.parts && payload.body) {
            const { mimeType, body } = payload;
            if (body.data) {
                const content = Buffer.from(body.data, "base64").toString("utf-8");
                if (mimeType === "text/plain") {
                    textContent = content;
                } else if (mimeType === "text/html") {
                    htmlContent = content;
                }
            }
            return { textContent, htmlContent, attachments };
        }

        // Process message parts
        const processParts = (parts: any[]) => {
            if (!parts) return;

            for (const part of parts) {
                const { mimeType, body, filename, parts: nestedParts } = part;

                // Handle nested parts
                if (nestedParts) {
                    processParts(nestedParts);
                    continue;
                }

                // Handle attachments
                if (filename && filename.length > 0 && body.attachmentId) {
                    attachments.push({
                        filename,
                        mimeType,
                        size: body.size || 0,
                        attachmentId: body.attachmentId
                    });
                    continue;
                }

                // Handle content
                if (body.data) {
                    const content = Buffer.from(body.data, "base64").toString("utf-8");
                    if (mimeType === "text/plain") {
                        textContent = content;
                    } else if (mimeType === "text/html") {
                        htmlContent = content;
                    }
                }
            }
        };

        if (payload.parts) {
            processParts(payload.parts);
        }

        return { textContent, htmlContent, attachments };
    }
}

export default new GmailService();
