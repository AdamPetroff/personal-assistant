import { financeAnalysisService } from "../services/financeAnalysisService";
import { logger } from "../utils/logger";

/**
 * Example usage of the Finance Analysis Service
 */
async function analyzeMonthlySpending() {
    try {
        // Get the current date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

        // Get previous month (handle December of previous year)
        const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Example 1: Get spending analysis for current month
        const currentMonthAnalysis = await financeAnalysisService.analyzeTransactionsByMonth(currentYear, currentMonth);

        logger.info(`Spending Analysis for ${currentMonth}/${currentYear}:`);
        logger.info(`Total Spending: $${currentMonthAnalysis.totalUsdSpending.toFixed(2)}`);
        logger.info(`Total Transactions: ${currentMonthAnalysis.totalTransactions}`);
        logger.info("Spending by Category:");

        currentMonthAnalysis.spendingByCategory.forEach((category) => {
            logger.info(
                `  ${category.category}: $${category.totalUsdAmount.toFixed(2)} (${category.transactionCount} transactions)`
            );
        });

        // Example 2: Compare current month with previous month
        const comparison = await financeAnalysisService.compareTimePeriods(
            new Date(previousMonthYear, previousMonth - 1, 1), // Start of previous month
            new Date(previousMonthYear, previousMonth, 0), // End of previous month
            new Date(currentYear, currentMonth - 1, 1), // Start of current month
            new Date(currentYear, currentMonth, 0) // End of current month
        );

        logger.info("\nMonth-to-Month Comparison:");
        logger.info(`Previous Month: $${comparison.firstPeriod.totalUsdSpending.toFixed(2)}`);
        logger.info(`Current Month: $${comparison.secondPeriod.totalUsdSpending.toFixed(2)}`);
        logger.info(
            `Difference: $${comparison.differences.totalUsdSpendingDifference.toFixed(2)} (${comparison.differences.percentageChange.toFixed(2)}%)`
        );

        logger.info("\nBiggest Category Changes:");
        comparison.differences.categoryChanges.slice(0, 5).forEach((change) => {
            const direction = change.usdAmountDifference >= 0 ? "increase" : "decrease";
            logger.info(
                `  ${change.category}: $${Math.abs(change.usdAmountDifference).toFixed(2)} ${direction} (${change.percentageChange.toFixed(2)}%)`
            );
        });

        // Example 3: Custom date range analysis
        const lastThreeMonths = new Date();
        lastThreeMonths.setMonth(lastThreeMonths.getMonth() - 3);

        const customRangeAnalysis = await financeAnalysisService.analyzeTransactionsByDateRange(
            lastThreeMonths,
            new Date(),
            { includeZeroAmounts: false }
        );

        logger.info("\nLast 3 Months Spending Analysis:");
        logger.info(`Total Spending: $${customRangeAnalysis.totalUsdSpending.toFixed(2)}`);
        logger.info(`Top 3 Categories:`);
        customRangeAnalysis.spendingByCategory.slice(0, 3).forEach((category) => {
            const percentage = (category.totalUsdAmount / customRangeAnalysis.totalUsdSpending) * 100;
            logger.info(
                `  ${category.category}: $${category.totalUsdAmount.toFixed(2)} (${percentage.toFixed(2)}% of total)`
            );
        });
    } catch (error) {
        logger.error("Error analyzing finance data:", error);
    }
}

// Run the example
analyzeMonthlySpending()
    .then(() => {
        logger.info("Finance analysis complete");
        process.exit(0);
    })
    .catch((err) => {
        logger.error("Failed to run finance analysis example:", err);
        process.exit(1);
    });
