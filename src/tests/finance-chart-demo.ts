import { generateFinanceChart } from "../services/chart/financeChartService";
import { financeSourceRepository } from "../services/database/repositories/FinanceSourceRepository";
import { logger } from "../utils/logger";

/**
 * Demo function to generate a finance chart
 */
async function runFinanceChartDemo() {
    try {
        // Set date range for chart (last 3 months)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        logger.info(
            `Generating finance chart from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        );

        // Generate chart with all finance sources
        const chartPath = await generateFinanceChart({
            startDate,
            endDate,
            title: "Finance Account Balances - Last 3 Months",
            showIndividualSources: true,
            width: 1000,
            height: 600
        });

        logger.info(`Finance chart generated at: ${chartPath}`);

        // Print some summary statistics about the data used
        const chartData = await financeSourceRepository.getFinanceChartData(startDate, endDate);

        if (chartData.length > 0) {
            // Show the number of data points
            logger.info(`Chart contains ${chartData.length} data points`);

            // Get and show list of sources
            const uniqueSources = new Map();
            chartData.forEach((dataPoint) => {
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
            const firstDataPoint = chartData[0];
            const lastDataPoint = chartData[chartData.length - 1];

            logger.info(
                `Balance on ${firstDataPoint.timestamp.toLocaleDateString()}: $${firstDataPoint.totalBalance.toLocaleString()}`
            );
            logger.info(
                `Balance on ${lastDataPoint.timestamp.toLocaleDateString()}: $${lastDataPoint.totalBalance.toLocaleString()}`
            );

            // Calculate change
            const change = lastDataPoint.totalBalance - firstDataPoint.totalBalance;
            const percentChange = (change / firstDataPoint.totalBalance) * 100;

            logger.info(`Change over period: $${change.toLocaleString()} (${percentChange.toFixed(2)}%)`);
        }
    } catch (error) {
        logger.error("Finance chart demo failed:", error);
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    runFinanceChartDemo()
        .then(() => logger.info("Finance chart demo completed"))
        .catch((err) => logger.error("Finance chart demo failed:", err));
}
