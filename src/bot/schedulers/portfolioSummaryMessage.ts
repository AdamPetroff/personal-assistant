import TelegramBot from "node-telegram-bot-api";
import { getCryptoPortfolioService } from "../../services/wallet/cryptoPortfolioService";
import { financeSourceRepository } from "../../services/database/repositories/FinanceSourceRepository";
import { generateUnifiedChart } from "../../services/chart/unifiedChartService";
import { logger } from "../../utils/logger";
import { CryptoPortfolioRepository } from "../../services/database/repositories/CryptoPortfolioRepository";

/**
 * Generates a portfolio summary message with crypto and finance data
 * plus a chart for visualization
 */
export async function generatePortfolioSummaryMessage(): Promise<{
    text: string;
    imageBuffer?: Buffer;
} | null> {
    try {
        // Get crypto portfolio service
        const cryptoPortfolioService = getCryptoPortfolioService();
        const cryptoPortfolioRepository = new CryptoPortfolioRepository();

        // Get latest crypto portfolio data
        const latestReport = await cryptoPortfolioService.getLatestReport();
        if (!latestReport) {
            logger.warn("No crypto portfolio data available for summary");
            return null;
        }

        // Get the full report data from repository for more details
        const fullReportData = await cryptoPortfolioRepository.getById(latestReport.reportId);
        if (!fullReportData) {
            logger.warn("Could not retrieve full crypto portfolio data");
            return null;
        }

        // Get latest finance data from all sources
        const financeData = await financeSourceRepository.getLatestStatements();

        // Calculate total asset value
        const totalCryptoValue = latestReport.totalValueUsd;
        const totalFinanceValue = financeData.reduce((sum, statement) => sum + statement.accountBalanceUsd, 0);
        const totalAssetValue = totalCryptoValue + totalFinanceValue;

        // Generate chart showing the data
        // Use last 30 days for the chart
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const chartBuffer = await generateUnifiedChart({
            startDate,
            title: "30-Day Asset Overview",
            showCrypto: true,
            showFinance: true,
            showIndividualSources: false
        });

        // Format the message text
        const messageText =
            `📊 *Asset Portfolio Summary*\n\n` +
            `*Total Assets:* $${totalAssetValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}\n` +
            `*Crypto:* $${totalCryptoValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} (${((totalCryptoValue / totalAssetValue) * 100).toFixed(2)}%)\n` +
            `*Finance:* $${totalFinanceValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} (${((totalFinanceValue / totalAssetValue) * 100).toFixed(2)}%)\n\n` +
            `*Crypto Breakdown:*\n` +
            `Wallets: $${fullReportData.walletsValueUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}\n` +
            `Exchanges: $${fullReportData.exchangeValueUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}\n\n` +
            `*Finance Breakdown:*\n${financeData
                .map(
                    (source) =>
                        `${source.sourceName}: $${source.accountBalanceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                )
                .join("\n")}`;

        return {
            text: messageText,
            imageBuffer: chartBuffer
        };
    } catch (error) {
        logger.error("Failed to generate portfolio summary message:", error);
        return {
            text: "Failed to generate portfolio summary. Check logs for details."
        };
    }
}
