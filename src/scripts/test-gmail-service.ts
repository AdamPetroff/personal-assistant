import gmailService from "../services/gmail";
import { logger } from "../utils/logger";
import path from "path";
import fs from "fs";

/**
 * Test script to demonstrate the Gmail service functionality
 */
async function main() {
    try {
        // Check if Gmail service is configured
        if (!gmailService.isConfigured()) {
            logger.error("Gmail service is not properly configured. Please set the required environment variables.");
            process.exit(1);
        }

        // Fetch recent unread emails
        logger.info("Fetching recent unread emails...");
        const emails = await gmailService.listEmails(5);

        if (emails.length === 0) {
            logger.info("No unread emails found.");
            return;
        }

        logger.info(`Found ${emails.length} unread emails:`);

        // Display email metadata
        emails.forEach((email, index) => {
            logger.info(`\n${index + 1}. Subject: ${email.subject}`);
            logger.info(`   From: ${email.from}`);
            logger.info(`   Date: ${email.date}`);
            logger.info(`   Has Attachments: ${email.hasAttachments}`);
            logger.info(`   ID: ${email.id}`);
        });

        // Fetch complete content for the first email
        if (emails.length > 0) {
            const firstEmailId = emails[0].id;
            logger.info(`\nFetching complete content for email: ${firstEmailId}`);

            const email = await gmailService.getEmail(firstEmailId);

            logger.info("Email content:");
            logger.info(`Text content length: ${email.textContent.length} characters`);
            logger.info(`HTML content length: ${email.htmlContent.length} characters`);

            // Display attachments
            if (email.attachments.length > 0) {
                logger.info(`\nAttachments (${email.attachments.length}):`);

                for (const attachment of email.attachments) {
                    logger.info(`- ${attachment.filename} (${attachment.mimeType}, ${attachment.size} bytes)`);

                    // Download and save the attachment
                    const savePath = await gmailService.saveAttachment(
                        email.id,
                        attachment.attachmentId,
                        attachment.filename,
                        attachment.mimeType
                    );

                    logger.info(`  Saved to: ${savePath}`);
                }
            } else {
                logger.info("No attachments found in this email.");
            }

            // Mark the email as read
            logger.info("\nMarking email as read...");
            await gmailService.markAsRead(firstEmailId);
            logger.info("Email marked as read successfully.");
        }
    } catch (error) {
        logger.error("Error in Gmail service test:", error);
    }
}

// Run the test
main();
