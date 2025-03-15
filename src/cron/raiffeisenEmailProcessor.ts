import cron from "node-cron";
import { raiffeisenEmailHandler } from "../services/raiffeisenEmailHandler";
import { logger } from "../utils/logger";

/**
 * Schedule email processing to run every hour
 * Cron format: Minute Hour Day Month DayOfWeek
 * "0 * * * *" = Run at minute 0 of every hour (hourly)
 */
export function scheduleRaiffeisenEmailProcessing(): void {
    logger.info("Scheduling Raiffeisen Bank email processing job (hourly)");

    cron.schedule("0 * * * *", async () => {
        try {
            logger.info("Running scheduled Raiffeisen Bank email processing");

            const count = await raiffeisenEmailHandler.processUnreadEmails();

            if (count > 0) {
                logger.info(`Successfully processed ${count} Raiffeisen Bank email(s)`);
            } else {
                logger.info("No Raiffeisen Bank emails to process");
            }
        } catch (error) {
            logger.error("Error in scheduled Raiffeisen Bank email processing:", error);
        }
    });
}

// If this file is run directly, start the scheduling
if (require.main === module) {
    scheduleRaiffeisenEmailProcessing();
}
