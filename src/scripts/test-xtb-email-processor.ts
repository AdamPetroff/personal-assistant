#!/usr/bin/env node
import { xtbEmailHandler } from "../services/xtbEmailHandler";
import GmailService, { EmailMetadata } from "../services/gmail";
import { logger } from "../utils/logger";
import { Command } from "commander";

// Initialize the program
const program = new Command();

program
    .name("test-xtb-email-processor")
    .description("Test the XTB email processor functionality")
    .option("-q, --query <query>", "Gmail search query", "from:dailystatements@xtb.com has:attachment")
    .option("-l, --limit <limit>", "Limit number of emails to process", "5")
    .option("-p, --process", "Actually process the emails (mark as read)")
    .option("-f, --force", "Force processing even if already read")
    .option("-v, --verbose", "Show verbose output");

program.parse(process.argv);
const options = program.opts();

/**
 * Main function to test XTB email processing
 */
async function main() {
    try {
        logger.info("Testing XTB statement email processor...");

        // Check if Gmail service is configured
        if (!GmailService.isConfigured()) {
            logger.error("Gmail service is not properly configured. Please check your .env file.");
            process.exit(1);
        }

        // Build the search query
        let query = options.query;
        if (!options.force) {
            // Only search for unread emails unless --force is specified
            query = `is:unread ${query}`;
        }

        logger.info(`Searching for emails with query: "${query}"`);

        // Fetch emails matching the query
        const emails = await GmailService.listEmails(parseInt(options.limit), query);

        if (emails.length === 0) {
            logger.info("No matching emails found.");
            return;
        }

        logger.info(`Found ${emails.length} matching email(s):`);

        // Display email metadata
        for (const email of emails) {
            logger.info(`- Subject: ${email.subject}`);
            logger.info(`  From: ${email.from}`);
            logger.info(`  Date: ${email.date.toISOString()}`);
            logger.info(`  Has Attachments: ${email.hasAttachments}`);

            if (options.verbose) {
                // Show more details in verbose mode
                const fullEmail = await GmailService.getEmail(email.id);
                logger.info(`  Attachments: ${fullEmail.attachments.length}`);

                for (const attachment of fullEmail.attachments) {
                    logger.info(`    - ${attachment.filename} (${attachment.mimeType}, ${attachment.size} bytes)`);
                }
            }
        }

        // Process emails if requested
        if (options.process) {
            logger.info("\nProcessing emails...");

            // Process directly using the handler's public method
            const processedCount = await xtbEmailHandler.processUnreadEmails();
            logger.info(`Processed ${processedCount} email(s).`);
        } else {
            logger.info("\nUse --process flag to process these emails.");
        }
    } catch (error) {
        logger.error("Error testing XTB email processor:", error);
        process.exit(1);
    }
}

// Run the test script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        logger.error("Unexpected error:", error);
        process.exit(1);
    });
