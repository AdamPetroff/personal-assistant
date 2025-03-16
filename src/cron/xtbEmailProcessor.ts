import cron from "node-cron";
import { xtbEmailHandler } from "../services/xtbEmailHandler";
import { logger } from "../utils/logger";

/**
 * Schedule XTB statement email processing to run twice daily
 */
export function scheduleXtbEmailProcessing(): void {
    logger.info("Scheduling XTB trading statement email processing job (twice daily)");

    cron.schedule("0 */12 * * *", async () => {
        try {
            logger.info("Running scheduled XTB trading statement email processing");

            const count = await xtbEmailHandler.processUnreadEmails();

            if (count > 0) {
                logger.info(`Successfully processed ${count} XTB trading statement email(s)`);
            } else {
                logger.info("No XTB trading statement emails to process");
            }
        } catch (error) {
            logger.error("Error in scheduled XTB trading statement email processing:", error);
        }
    });
}

// If this file is run directly, start the scheduling
if (require.main === module) {
    scheduleXtbEmailProcessing();
}
