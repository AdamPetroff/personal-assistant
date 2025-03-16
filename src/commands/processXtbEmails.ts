#!/usr/bin/env node
import { xtbEmailHandler } from "../services/xtbEmailHandler";
import { logger } from "../utils/logger";

async function main() {
    try {
        logger.info("Starting to process XTB trading statement emails...");

        const count = await xtbEmailHandler.processUnreadEmails();

        if (count > 0) {
            logger.info(`Successfully processed ${count} XTB trading statement email(s)`);
        } else {
            logger.info("No XTB trading statement emails to process");
        }
    } catch (error) {
        logger.error("Error processing XTB trading statement emails:", error);
        process.exit(1);
    }
}

// Run the main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        logger.error("Unexpected error:", error);
        process.exit(1);
    });
