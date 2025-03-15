import { generateUnifiedChart } from "../services/chart/unifiedChartService";
import { financeSourceRepository } from "../services/database/repositories/FinanceSourceRepository";
import { CryptoPortfolioRepository } from "../services/database/repositories/CryptoPortfolioRepository";
import { logger } from "../utils/logger";
import path from "path";
import fs from "fs";

const cryptoPortfolioRepository = new CryptoPortfolioRepository();

/**
 * Demo function to generate a unified chart with both crypto and finance data
 */
async function runUnifiedChartDemo() {
    try {
        // Set date range for chart (last 3 months)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        logger.info(
            `Generating unified chart from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        );

        // Generate unified chart with all data sources
        const chartBuffer = await generateUnifiedChart({
            startDate,
            endDate,
            title: "Unified Assets Overview - Last 3 Months",
            showIndividualSources: true,
            width: 1200,
            height: 700
        });

        const fileName = `unified-chart-${Date.now()}.png`;

        // Create output directory if it doesn't exist
        const fullOutputPath = path.resolve("uploads/charts");
        if (!fs.existsSync(fullOutputPath)) {
            fs.mkdirSync(fullOutputPath, { recursive: true });
        }

        // Save the chart to a file
        const filePath = path.join(fullOutputPath, fileName);
        fs.writeFileSync(filePath, chartBuffer);

        logger.info(`Unified chart generated and saved to: ${filePath}`);

        // Print summary statistics about the crypto data
        const cryptoData = await cryptoPortfolioRepository.getChartData(startDate, endDate);

        if (cryptoData.length > 0) {
            logger.info(`Crypto chart contains ${cryptoData.length} data points`);

            // Show first and last data point totals
            const firstCryptoPoint = cryptoData[0];
            const lastCryptoPoint = cryptoData[cryptoData.length - 1];

            logger.info(
                `Crypto balance on ${firstCryptoPoint.timestamp.toLocaleDateString()}: $${firstCryptoPoint.totalValueUsd.toLocaleString()}`
            );
            logger.info(
                `Crypto balance on ${lastCryptoPoint.timestamp.toLocaleDateString()}: $${lastCryptoPoint.totalValueUsd.toLocaleString()}`
            );

            // Calculate change
            const cryptoChange = lastCryptoPoint.totalValueUsd - firstCryptoPoint.totalValueUsd;
            const cryptoPercentChange = (cryptoChange / firstCryptoPoint.totalValueUsd) * 100;

            logger.info(
                `Crypto change over period: $${cryptoChange.toLocaleString()} (${cryptoPercentChange.toFixed(2)}%)`
            );
        } else {
            logger.info("No crypto data available for the selected period");
        }

        // Print summary statistics about the finance data
        const financeData = await financeSourceRepository.getFinanceChartData(startDate, endDate);

        if (financeData.length > 0) {
            logger.info(`Finance chart contains ${financeData.length} data points`);

            // Get and show list of sources
            const uniqueSources = new Map();
            financeData.forEach((dataPoint) => {
                dataPoint.sourceBalances.forEach((source) => {
                    uniqueSources.set(source.sourceId, {
                        name: source.sourceName,
                        type: source.sourceType
                    });
                });
            });

            logger.info(`Finance sources included (${uniqueSources.size}):`);
            for (const [sourceId, sourceInfo] of uniqueSources.entries()) {
                logger.info(`- ${sourceInfo.name} (${sourceInfo.type})`);
            }

            // Show first and last data point totals
            const firstFinancePoint = financeData[0];
            const lastFinancePoint = financeData[financeData.length - 1];

            logger.info(
                `Finance balance on ${firstFinancePoint.timestamp.toLocaleDateString()}: $${firstFinancePoint.totalBalance.toLocaleString()}`
            );
            logger.info(
                `Finance balance on ${lastFinancePoint.timestamp.toLocaleDateString()}: $${lastFinancePoint.totalBalance.toLocaleString()}`
            );

            // Calculate change
            const financeChange = lastFinancePoint.totalBalance - firstFinancePoint.totalBalance;
            const financePercentChange = (financeChange / firstFinancePoint.totalBalance) * 100;

            logger.info(
                `Finance change over period: $${financeChange.toLocaleString()} (${financePercentChange.toFixed(2)}%)`
            );
        } else {
            logger.info("No finance data available for the selected period");
        }

        // Calculate combined totals if both data sets are available
        if (cryptoData.length > 0 && financeData.length > 0) {
            // Get the most recent data points
            const latestCrypto = cryptoData[cryptoData.length - 1];
            const latestFinance = financeData[financeData.length - 1];

            // Calculate combined total
            const combinedTotal = latestCrypto.totalValueUsd + latestFinance.totalBalance;

            logger.info(`Combined total assets: $${combinedTotal.toLocaleString()}`);
            logger.info(`Crypto allocation: ${((latestCrypto.totalValueUsd / combinedTotal) * 100).toFixed(2)}%`);
            logger.info(`Finance allocation: ${((latestFinance.totalBalance / combinedTotal) * 100).toFixed(2)}%`);
        }
    } catch (error) {
        logger.error("Unified chart demo failed:", error);
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    runUnifiedChartDemo()
        .then(() => logger.info("Unified chart demo completed"))
        .catch((err) => logger.error("Unified chart demo failed:", err));
}
