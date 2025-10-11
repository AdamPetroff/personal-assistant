import type { Request, Response } from "express";
import { getCryptoPortfolioService } from "../services/wallet/cryptoPortfolioService";
import { logger } from "../utils/logger";

/**
 * Controller for portfolio-related operations
 */
export class PortfolioController {
    /**
     * Get the latest portfolio report
     */
    async getLatestReport(_req: Request, res: Response) {
        try {
            const portfolioService = getCryptoPortfolioService();
            const report = await portfolioService.getLatestReport();

            if (!report) {
                return res.status(404).json({ message: "No portfolio reports found" });
            }

            return res.status(200).json(report);
        } catch (error) {
            logger.error("Failed to get latest portfolio report:", error);
            return res.status(500).json({ message: "Failed to get latest portfolio report" });
        }
    }

    /**
     * Generate a new portfolio report and save it
     */
    async generateReport(_req: Request, res: Response) {
        try {
            const portfolioService = getCryptoPortfolioService();
            const result = await portfolioService.generateAndSaveReport();

            return res.status(201).json({
                reportId: result.reportId,
                totalValueUsd: result.totalValueUsd,
                message: "Portfolio report generated successfully"
            });
        } catch (error) {
            logger.error("Failed to generate portfolio report:", error);
            return res.status(500).json({ message: "Failed to generate portfolio report" });
        }
    }

    /**
     * Get portfolio chart data for a specified period
     */
    async getChartData(req: Request, res: Response) {
        try {
            const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

            const portfolioService = getCryptoPortfolioService();
            const chartData = await portfolioService.getChartData(days);

            if (chartData.length === 0) {
                return res.status(404).json({ message: "No portfolio data found for the specified period" });
            }

            return res.status(200).json(chartData);
        } catch (error) {
            logger.error("Failed to get portfolio chart data:", error);
            return res.status(500).json({ message: "Failed to get portfolio chart data" });
        }
    }
}
