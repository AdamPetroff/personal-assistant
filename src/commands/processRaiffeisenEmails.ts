#!/usr/bin/env node
import { raiffeisenEmailHandler } from "../services/raiffeisenEmailHandler";
import { logger } from "../utils/logger";

async function main() {
    try {
        logger.info("Starting to process Raiffeisen Bank emails...");

        const count = await raiffeisenEmailHandler.processUnreadEmails();

        if (count > 0) {
            logger.info(`Successfully processed ${count} Raiffeisen Bank email(s)`);
        } else {
            logger.info("No Raiffeisen Bank emails to process");
        }
    } catch (error) {
        logger.error("Error processing Raiffeisen Bank emails:", error);
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
