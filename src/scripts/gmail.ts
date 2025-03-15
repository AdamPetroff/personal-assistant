#!/usr/bin/env node
import { Command } from "commander";
import gmailService, { EmailAttachment } from "../services/gmail";
import { logger } from "../utils/logger";
import fs from "fs";
import path from "path";

// Initialize the program
const program = new Command();

program.name("gmail-cli").description("CLI tool to interact with Gmail").version("1.0.0");

// Command to list emails
program
    .command("list")
    .description("List recent emails from Gmail")
    .option("-m, --max <number>", "Maximum number of emails to fetch", "10")
    .option("-q, --query <string>", "Gmail search query", "")
    .action(async (options) => {
        try {
            const maxResults = parseInt(options.max, 10);
            logger.info(
                `Fetching up to ${maxResults} emails${options.query ? ` with query: ${options.query}` : ""}...`
            );

            if (!gmailService.isConfigured()) {
                logger.error("Gmail service is not configured properly. Please check your credentials.");
                process.exit(1);
            }

            const emails = await gmailService.listEmails(maxResults, options.query);

            if (emails.length === 0) {
                logger.info("No emails found matching your criteria.");
                process.exit(0);
            }

            logger.info(`Found ${emails.length} emails.`);

            // Print email list
            console.log("\nEmails:");
            emails.forEach((email, index) => {
                console.log(`\n[${index + 1}] ID: ${email.id}`);
                console.log(`    Subject: ${email.subject}`);
                console.log(`    From: ${email.from}`);
                console.log(`    Date: ${email.date.toLocaleString()}`);
                console.log(`    Snippet: ${email.snippet}`);
                if (email.hasAttachments) {
                    console.log(`    Has Attachments: Yes`);
                }
            });
            console.log("\n");
        } catch (error) {
            logger.error("Failed to fetch emails:", error);
            process.exit(1);
        }
    });

// Command to read a specific email
program
    .command("read")
    .description("Read a specific email by ID")
    .argument("<emailId>", "The ID of the email to read")
    .option("-m, --mark-read", "Mark the email as read", false)
    .option("-s, --save-to <path>", "Save the email content to a file")
    .action(async (emailId, options) => {
        try {
            logger.info(`Fetching email with ID: ${emailId}...`);

            if (!gmailService.isConfigured()) {
                logger.error("Gmail service is not configured properly. Please check your credentials.");
                process.exit(1);
            }

            const email = await gmailService.getEmail(emailId);

            // Print email details
            console.log("\nEmail Details:");
            console.log(`Subject: ${email.subject}`);
            console.log(`From: ${email.from}`);
            console.log(`To: ${email.to.join(", ")}`);
            console.log(`Date: ${email.date.toLocaleString()}`);

            if (email.attachments.length > 0) {
                console.log(`\nAttachments (${email.attachments.length}):`);
                email.attachments.forEach((attachment, index) => {
                    console.log(
                        `  [${index + 1}] ${attachment.filename} (${attachment.mimeType}, ${formatFileSize(attachment.size)})`
                    );
                });
            }

            console.log("\nContent:");
            // Prefer text content if available, otherwise use HTML
            const content = email.textContent || stripHtmlTags(email.htmlContent);
            console.log(content);

            // Save to file if requested
            if (options.saveTo) {
                const filePath = path.resolve(options.saveTo);
                const emailContent = JSON.stringify(
                    {
                        subject: email.subject,
                        from: email.from,
                        to: email.to,
                        date: email.date,
                        textContent: email.textContent,
                        htmlContent: email.htmlContent,
                        attachments: email.attachments.map((a) => ({
                            filename: a.filename,
                            mimeType: a.mimeType,
                            size: a.size,
                            attachmentId: a.attachmentId
                        }))
                    },
                    null,
                    2
                );
                fs.writeFileSync(filePath, emailContent);
                logger.info(`Email content saved to file: ${filePath}`);
            }

            // Mark as read if requested
            if (options.markRead) {
                await gmailService.markAsRead(emailId);
                logger.info("Email marked as read.");
            }
        } catch (error) {
            logger.error(`Failed to fetch email ${emailId}:`, error);
            process.exit(1);
        }
    });

// Command to download attachments
program
    .command("attachment")
    .description("Download an attachment from an email")
    .argument("<emailId>", "The ID of the email")
    .argument("<attachmentId>", "The ID of the attachment")
    .option("-o, --output <path>", "Output directory to save the attachment", ".")
    .action(async (emailId, attachmentId, options) => {
        try {
            logger.info(`Downloading attachment ${attachmentId} from email ${emailId}...`);

            if (!gmailService.isConfigured()) {
                logger.error("Gmail service is not configured properly. Please check your credentials.");
                process.exit(1);
            }

            // First, get the email to retrieve attachment metadata
            const email = await gmailService.getEmail(emailId);
            const attachment = email.attachments.find((a) => a.attachmentId === attachmentId);
            console.log(
                email.attachments.map((a) => a.attachmentId),
                "---",
                attachmentId
            );

            if (!attachment) {
                logger.error(`Attachment with ID ${attachmentId} not found in email ${emailId}.`);
                process.exit(1);
            }

            // Create output directory if it doesn't exist
            const outputDir = path.resolve(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Save the attachment
            const filePath = await gmailService.saveAttachment(
                emailId,
                attachmentId,
                path.join(outputDir, attachment.filename),
                attachment.mimeType
            );

            logger.info(`Attachment saved to: ${filePath}`);
        } catch (error) {
            logger.error(`Failed to download attachment:`, error);
            process.exit(1);
        }
    });

// Command to list all attachments from an email
program
    .command("list-attachments")
    .description("List all attachments in an email")
    .argument("<emailId>", "The ID of the email")
    .action(async (emailId) => {
        try {
            logger.info(`Fetching attachments for email ${emailId}...`);

            if (!gmailService.isConfigured()) {
                logger.error("Gmail service is not configured properly. Please check your credentials.");
                process.exit(1);
            }

            // Get the email
            const email = await gmailService.getEmail(emailId);

            if (email.attachments.length === 0) {
                logger.info(`No attachments found in email ${emailId}.`);
                process.exit(0);
            }

            // Print attachment details
            console.log(`\nAttachments for email "${email.subject}":`);
            email.attachments.forEach((attachment, index) => {
                console.log(`\n[${index + 1}] ${attachment.filename}`);
                console.log(`    ID: ${attachment.attachmentId}`);
                console.log(`    Type: ${attachment.mimeType}`);
                console.log(`    Size: ${formatFileSize(attachment.size)}`);
            });
            console.log("\n");
        } catch (error) {
            logger.error(`Failed to list attachments for email ${emailId}:`, error);
            process.exit(1);
        }
    });

// Command to download all attachments from an email
program
    .command("download-all")
    .description("Download all attachments from an email")
    .argument("<emailId>", "The ID of the email")
    .option("-o, --output <path>", "Output directory to save the attachments", ".")
    .action(async (emailId, options) => {
        try {
            logger.info(`Downloading all attachments from email ${emailId}...`);

            if (!gmailService.isConfigured()) {
                logger.error("Gmail service is not configured properly. Please check your credentials.");
                process.exit(1);
            }

            // Get the email
            const email = await gmailService.getEmail(emailId);

            if (email.attachments.length === 0) {
                logger.info(`No attachments found in email ${emailId}.`);
                process.exit(0);
            }

            // Create output directory if it doesn't exist
            const outputDir = path.resolve(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Download each attachment
            for (const attachment of email.attachments) {
                logger.info(`Downloading ${attachment.filename}...`);

                const filePath = await gmailService.saveAttachment(
                    emailId,
                    attachment.attachmentId,
                    path.join(outputDir, attachment.filename),
                    attachment.mimeType
                );

                logger.info(`Saved to: ${filePath}`);
            }

            logger.info(`All attachments (${email.attachments.length}) downloaded successfully.`);
        } catch (error) {
            logger.error(`Failed to download attachments for email ${emailId}:`, error);
            process.exit(1);
        }
    });

// Utility functions
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>?/gm, "");
}

// Handle unknown commands
program.on("command:*", () => {
    console.error("Invalid command: %s\nSee --help for a list of available commands.", program.args.join(" "));
    process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length === 2) {
    program.help();
}
