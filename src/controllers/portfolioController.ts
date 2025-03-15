import { Request, Response } from "express";
import { getCryptoPortfolioService } from "../services/wallet/cryptoPortfolioService";
import { logger } from "../utils/logger";
import path from "path";

/**
 * Controller for portfolio-related operations
 */
export class PortfolioController {
    /**
     * Get the latest portfolio report
     */
    async getLatestReport(req: Request, res: Response) {
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
    async generateReport(req: Request, res: Response) {
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

    /**
     * Generate a portfolio chart image and return its path
     */
    async generateChartImage(req: Request, res: Response) {
        try {
            const {
                days = 30,
                width = 800,
                height = 400,
                title
            } = req.query as {
                days?: string;
                width?: string;
                height?: string;
                title?: string;
            };

            const daysNum = parseInt(days as string, 10);
            const widthNum = parseInt(width as string, 10);
            const heightNum = parseInt(height as string, 10);

            const portfolioService = getCryptoPortfolioService();
            const imagePath = await portfolioService.generateChartImage(daysNum, {
                width: widthNum,
                height: heightNum,
                title: title as string
            });

            // Get the filename from the path
            const filename = path.basename(imagePath);

            // Return the path to the image and a URL that can be used to access it
            return res.status(200).json({
                imagePath,
                filename,
                url: `/charts/${filename}`,
                message: "Chart generated successfully"
            });
        } catch (error: any) {
            logger.error("Failed to generate chart image:", error);
            return res.status(500).json({
                message: "Failed to generate chart image",
                error: error.message
            });
        }
    }

    /**
     * Serve a chart image directly as a response
     */
    async serveChartImage(req: Request, res: Response) {
        try {
            const {
                days = 30,
                width = 800,
                height = 400,
                title
            } = req.query as {
                days?: string;
                width?: string;
                height?: string;
                title?: string;
            };

            const daysNum = parseInt(days as string, 10);
            const widthNum = parseInt(width as string, 10);
            const heightNum = parseInt(height as string, 10);

            const portfolioService = getCryptoPortfolioService();
            const imagePath = await portfolioService.generateChartImage(daysNum, {
                width: widthNum,
                height: heightNum,
                title: title as string
            });

            // Send the file
            return res.sendFile(path.resolve(imagePath));
        } catch (error: any) {
            logger.error("Failed to serve chart image:", error);
            return res.status(500).json({
                message: "Failed to serve chart image",
                error: error.message
            });
        }
    }
}
