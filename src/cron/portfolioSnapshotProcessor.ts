import cron from "node-cron";
import { getCryptoPortfolioService } from "../services/wallet/cryptoPortfolioService";
import { logger } from "../utils/logger";

/**
 * Schedule portfolio snapshot to run daily at midnight
 * Cron format: Minute Hour Day Month DayOfWeek
 * "0 0 * * *" = Run at 00:00 (midnight) every day
 */
export function schedulePortfolioSnapshot(): void {
    logger.info("Scheduling daily crypto portfolio snapshot job");

    cron.schedule("0 4 * * *", async () => {
        try {
            logger.info("Running scheduled crypto portfolio snapshot");

            const portfolioService = getCryptoPortfolioService();
            const result = await portfolioService.generateAndSaveReport();

            logger.info(
                `Successfully saved crypto portfolio snapshot (ID: ${result.reportId}) with total value: $${result.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            );
        } catch (error) {
            logger.error("Error in scheduled crypto portfolio snapshot:", error);
        }
    });
}

// If this file is run directly, start the scheduling
if (require.main === module) {
    schedulePortfolioSnapshot();
}
