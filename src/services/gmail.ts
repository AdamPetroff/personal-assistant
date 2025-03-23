import { google } from "googleapis";
import { Readable } from "stream";
import { logger } from "../utils/logger";
import { GMAIL_CONFIG } from "../config/constants";
import { FileService } from "./fileService";
import fs from "fs";
import path from "path";

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

// Interface for token information
interface TokenInfo {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
}

export class GmailService {
    private readonly gmail;
    private readonly auth;
    private readonly fileService: FileService;
    private readonly tokenPath: string;
    private tokenInfo: TokenInfo | null = null;

    constructor() {
        this.fileService = new FileService();
        this.tokenPath = path.join(process.cwd(), ".gmail_token.json");

        // Setup OAuth2 client
        this.auth = new google.auth.OAuth2(GMAIL_CONFIG.clientId, GMAIL_CONFIG.clientSecret, GMAIL_CONFIG.redirectUri);

        // Load existing tokens if available
        this.loadTokens();

        // Set token refresh callback
        this.auth.on("tokens", (tokens) => {
            this.handleTokenRefresh(tokens);
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
        return !!(
            GMAIL_CONFIG.clientId &&
            GMAIL_CONFIG.clientSecret &&
            (GMAIL_CONFIG.refreshToken || (this.tokenInfo && this.tokenInfo.refresh_token))
        );
    }

    /**
     * Load saved tokens from file if they exist
     */
    private loadTokens(): void {
        try {
            if (fs.existsSync(this.tokenPath)) {
                const tokenData = fs.readFileSync(this.tokenPath, "utf8");
                this.tokenInfo = JSON.parse(tokenData);
                logger.info("Gmail tokens loaded from file");

                // Set credentials from loaded tokens
                this.auth.setCredentials({
                    refresh_token: this.tokenInfo?.refresh_token,
                    access_token: this.tokenInfo?.access_token,
                    expiry_date: this.tokenInfo?.expiry_date
                });
            } else if (GMAIL_CONFIG.refreshToken) {
                // Use the refresh token from env variables if no saved tokens
                this.auth.setCredentials({
                    refresh_token: GMAIL_CONFIG.refreshToken
                });
                logger.info("Using refresh token from environment variables");
            } else {
                logger.warn("No Gmail tokens found");
            }
        } catch (error) {
            logger.error("Error loading Gmail tokens:", error);

            // Fall back to refresh token from env if available
            if (GMAIL_CONFIG.refreshToken) {
                this.auth.setCredentials({
                    refresh_token: GMAIL_CONFIG.refreshToken
                });
            }
        }
    }

    /**
     * Handle token refresh event
     * @param tokens New tokens from OAuth2 refresh
     */
    private handleTokenRefresh(tokens: any): void {
        logger.info("Gmail tokens refreshed");

        // Update token info with new values while preserving existing ones
        this.tokenInfo = {
            ...this.tokenInfo,
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            token_type: tokens.token_type || this.tokenInfo?.token_type || "Bearer",
            scope: tokens.scope || this.tokenInfo?.scope || "",
            // Keep existing refresh token if new one is not provided
            refresh_token: tokens.refresh_token || this.tokenInfo?.refresh_token || GMAIL_CONFIG.refreshToken
        } as TokenInfo;

        // Save updated tokens to file
        this.saveTokens();
    }

    /**
     * Save tokens to a file
     */
    private saveTokens(): void {
        try {
            if (this.tokenInfo) {
                fs.writeFileSync(this.tokenPath, JSON.stringify(this.tokenInfo, null, 2));
                logger.info("Gmail tokens saved to file");
            }
        } catch (error) {
            logger.error("Error saving Gmail tokens:", error);
        }
    }

    /**
     * Force token refresh
     * @returns True if token refresh was successful
     */
    public async refreshTokens(): Promise<boolean> {
        try {
            logger.info("Forcing Gmail token refresh");
            const response = await this.auth.refreshAccessToken();

            // The response contains credentials which include the new access token
            logger.info("Gmail access token refreshed successfully");
            return !!response.credentials.access_token;
        } catch (error) {
            logger.error("Failed to refresh Gmail access token:", error);
            return false;
        }
    }

    /**
     * Generate authorization URL for getting a new refresh token
     * @param scopes OAuth scopes to request
     * @returns URL for authorization
     */
    public getAuthUrl(
        scopes: string[] = [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify"
        ]
    ): string {
        return this.auth.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent" // Force to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param code Authorization code from OAuth flow
     * @returns True if successful
     */
    public async getTokensFromCode(code: string): Promise<boolean> {
        try {
            const { tokens } = await this.auth.getToken(code);
            this.auth.setCredentials(tokens);

            // Handle the tokens like in a regular refresh
            this.handleTokenRefresh(tokens);

            return true;
        } catch (error) {
            logger.error("Error exchanging code for tokens:", error);
            return false;
        }
    }

    /**
     * Execute an API request with automatic retry on auth failure
     * @param apiCall Function that makes the API call
     * @returns Result of the API call
     */
    private async executeWithTokenRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
        try {
            // Try the API call
            return await apiCall();
        } catch (error: any) {
            // If it's an auth error, try to refresh the token and retry
            if (
                error.code === 401 ||
                (error.response && error.response.status === 401) ||
                error.message?.includes("invalid_grant")
            ) {
                logger.warn("Authentication error detected, attempting to refresh tokens");

                const refreshed = await this.refreshTokens();
                if (refreshed) {
                    // Retry the API call with the new token
                    return await apiCall();
                } else {
                    throw new Error("Failed to refresh authentication tokens. Re-authentication required.");
                }
            }

            // For other errors, just throw them
            throw error;
        }
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
