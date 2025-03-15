import { WalletReport } from "./types";
import { WalletService } from "./walletService";
import { binanceService, initBinanceService } from "../binance";
import {
    CryptoPortfolioRepository,
    CryptoPortfolioReportData,
    PortfolioChartDataPoint
} from "../database/repositories/CryptoPortfolioRepository";
import { logger } from "../../utils/logger";
import { getChartService } from "../chart/chartService";

// Interface for Binance balance
interface ProcessedBalance {
    asset: string;
    total: any; // BigNumber
    valueUsd: number;
}

/**
 * Service for managing crypto portfolio data and reports
 */
export class CryptoPortfolioService {
    private readonly walletService: WalletService;
    private readonly cryptoPortfolioRepository: CryptoPortfolioRepository;

    constructor() {
        this.walletService = new WalletService();
        this.cryptoPortfolioRepository = new CryptoPortfolioRepository();

        // Initialize Binance service if not already initialized
        try {
            initBinanceService();
        } catch (error) {
            logger.warn("Could not initialize Binance service, continuing without it:", error);
        }
    }

    /**
     * Generate a portfolio report and save it to the database
     */
    async generateAndSaveReport(): Promise<{
        reportId: string;
        totalValueUsd: number;
        formattedReport: string;
    }> {
        try {
            // Get wallet data
            const walletData = await this.walletService.getAllWalletsValueUsd();

            // Get Binance data
            let binanceTotalUsd = 0;
            let binanceBalances: ProcessedBalance[] = [];
            try {
                const binanceInstance = binanceService();
                binanceTotalUsd = await binanceInstance.getTotalBalanceUsd();
                binanceBalances = await binanceInstance.getNonZeroBalances();
            } catch (error) {
                logger.warn("Could not fetch Binance balance:", error);
            }

            // Generate report
            const { totalUsd, formattedReport } = await this.walletService.getTotalCryptoHoldings();

            // Prepare data for database
            const reportData: CryptoPortfolioReportData = {
                totalValueUsd: totalUsd,
                walletsValueUsd: walletData.totalValueUsd,
                exchangeValueUsd: binanceTotalUsd,
                data: {
                    wallets: walletData.wallets,
                    binanceBalances,
                    timestamp: new Date().toISOString()
                }
            };

            // Save report to database
            const reportId = await this.cryptoPortfolioRepository.save(reportData);

            return {
                reportId,
                totalValueUsd: totalUsd,
                formattedReport
            };
        } catch (error) {
            logger.error("Failed to generate and save portfolio report:", error);
            throw new Error("Failed to generate and save portfolio report");
        }
    }

    /**
     * Get latest portfolio report from database
     */
    async getLatestReport(): Promise<{
        reportId: string;
        totalValueUsd: number;
        timestamp: Date;
        formattedReport: string;
    } | null> {
        try {
            const report = await this.cryptoPortfolioRepository.getLatest();
            if (!report) return null;

            // Format report nicely
            let formattedReport = `*Crypto Portfolio Report*\n\n`;
            formattedReport += `*Total Value:* $${report.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            formattedReport += `*Wallet Holdings:* $${report.walletsValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            formattedReport += `*Exchange Holdings:* $${report.exchangeValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            formattedReport += `_Generated at: ${report.timestamp.toLocaleString()}_`;

            return {
                reportId: report.id,
                totalValueUsd: report.totalValueUsd,
                timestamp: report.timestamp,
                formattedReport
            };
        } catch (error) {
            logger.error("Failed to get latest portfolio report:", error);
            throw new Error("Failed to get latest portfolio report");
        }
    }

    /**
     * Get chart data for portfolio value over time
     */
    async getChartData(days = 30): Promise<PortfolioChartDataPoint[]> {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            return await this.cryptoPortfolioRepository.getChartData(startDate, endDate);
        } catch (error) {
            logger.error("Failed to get portfolio chart data:", error);
            throw new Error("Failed to get portfolio chart data");
        }
    }

    /**
     * Generate a portfolio chart image for the specified time period
     * @param days Number of days to include in the chart
     * @param options Chart generation options
     * @returns Path to the generated chart image
     */
    async generateChartImage(
        days = 30,
        options: {
            width?: number;
            height?: number;
            title?: string;
            outputPath?: string;
            fileName?: string;
        } = {}
    ): Promise<string> {
        try {
            logger.info(`Generating portfolio chart image for the last ${days} days...`);

            // Get chart data
            const chartData = await this.getChartData(days);

            if (chartData.length === 0) {
                throw new Error("No portfolio data found for the specified period");
            }

            // Set default title with date range
            if (!options.title) {
                const startDate = new Date(chartData[0].timestamp);
                const endDate = new Date(chartData[chartData.length - 1].timestamp);
                options.title = `Crypto Portfolio Value (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
            }

            // Generate chart image
            const chartService = getChartService();
            const imagePath = await chartService.generateCryptoPortfolioLineChart(chartData, options);

            return imagePath;
        } catch (error) {
            logger.error("Failed to generate portfolio chart image:", error);
            throw new Error("Failed to generate portfolio chart image");
        }
    }

    /**
     * Clean up old reports, keeping only the most recent N reports
     */
    async cleanupOldReports(keepDays = 365): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - keepDays);

            return await this.cryptoPortfolioRepository.deleteOlderThan(cutoffDate);
        } catch (error) {
            logger.error("Failed to clean up old portfolio reports:", error);
            throw new Error("Failed to clean up old portfolio reports");
        }
    }
}

// Singleton instance
let cryptoPortfolioServiceInstance: CryptoPortfolioService | null = null;

/**
 * Get the portfolio service instance
 */
export function getCryptoPortfolioService(): CryptoPortfolioService {
    if (!cryptoPortfolioServiceInstance) {
        cryptoPortfolioServiceInstance = new CryptoPortfolioService();
    }
    return cryptoPortfolioServiceInstance;
}
