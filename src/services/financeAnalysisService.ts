import { db } from "./database/client";
import { logger } from "../utils/logger";
import { Currency } from "./database/db";
import { env } from "../config/constants";
import { Tool, tool } from "@langchain/core/tools";
import { z } from "zod";
import { langchainService } from "./langchain";
import { startOfDay, endOfDay } from "../utils/dateUtils";
import { exchangeRateService } from "./exchangeRate";

export interface SpendingByCategory {
    category: string;
    // totalAmount: number;
    totalUsdAmount: number;
    transactionCount: number;
    currency?: Currency;
}

export interface IndividualTransaction {
    name: string;
    usdAmount: number;
}

export interface TransactionTimeRangeAnalysis {
    startDate: Date;
    endDate: Date;
    totalUsdSpending: number;
    totalCzkSpending: number;
    spendingByCategory: SpendingByCategory[];
    totalTransactions: number;
    individualTransactions?: IndividualTransaction[];
}

export class FinanceAnalysisService {
    /**
     * Get an analysis of transactions within a specific date range
     */
    async analyzeTransactionsByDateRange(
        startDate: Date,
        endDate: Date,
        options?: {
            currency?: Currency;
            includeZeroAmounts?: boolean;
            expanded?: boolean;
        }
    ): Promise<TransactionTimeRangeAnalysis> {
        try {
            // Build the query
            let query = db
                .selectFrom("finance_transaction")
                .select([
                    "category",
                    db.fn.count<number>("id").as("transactionCount"),
                    db.fn.sum<string>("amount").as("totalAmount"),
                    db.fn.sum<string>("usdAmount").as("totalUsdAmount")
                ])
                .where("transactionDate", ">=", startDate)
                .where("transactionDate", "<=", endDate)
                .groupBy("category");

            // Add currency filter if specified
            if (options?.currency) {
                query = query.where("currency", "=", options.currency);
            }

            // Execute the query
            const results = await query.execute();

            // Get total spending
            const totals = await db
                .selectFrom("finance_transaction")
                .select([
                    db.fn.sum<string>("amount").as("totalAmount"),
                    db.fn.sum<string>("usdAmount").as("totalUsdAmount"),
                    db.fn.count<number>("id").as("totalTransactions")
                ])
                .where("transactionDate", ">=", startDate)
                .where("transactionDate", "<=", endDate)
                .executeTakeFirst();

            // Fetch individual transactions if expanded is true
            let individualTransactions: IndividualTransaction[] | undefined;

            if (options?.expanded) {
                const transactionsQuery = db
                    .selectFrom("finance_transaction")
                    .select(["name", "usdAmount", "amount", "currency"])
                    .where("transactionDate", ">=", startDate)
                    .where("transactionDate", "<=", endDate);

                if (options?.currency) {
                    transactionsQuery.where("currency", "=", options.currency);
                }

                const transactions = await transactionsQuery.execute();

                individualTransactions = transactions.map((t) => ({
                    name: t.name,
                    usdAmount: Number(t.usdAmount),
                    czkAmount: Number(
                        t.currency === "CZK"
                            ? t.amount
                            : exchangeRateService.convertCurrency(t.usdAmount, t.currency, "CZK")
                    )
                }));
            }

            // Convert amounts from string to number
            const spendingByCategory = results
                .map((row) => ({
                    category: row.category,
                    // totalAmount: Number(row.totalAmount),
                    totalUsdAmount: Number(row.totalUsdAmount),
                    transactionCount: Number(row.transactionCount),
                    ...(options?.currency && { currency: options.currency })
                }))
                .filter((category) => options?.includeZeroAmounts || category.totalUsdAmount !== 0)
                .sort((a, b) => b.totalUsdAmount - a.totalUsdAmount); // Sort by USD amount, highest first

            return {
                startDate,
                endDate,
                // totalSpending: Number(totals?.totalAmount || 0),
                totalUsdSpending: Number(totals?.totalUsdAmount || 0),
                totalCzkSpending: Number(
                    (await exchangeRateService.convertCurrency(totals?.totalUsdAmount || 0, "USD", "CZK")).toNumber()
                ),
                spendingByCategory,
                totalTransactions: Number(totals?.totalTransactions || 0),
                ...(individualTransactions && { individualTransactions })
            };
        } catch (error) {
            logger.error("Failed to analyze transactions by date range:", error);
            throw new Error("Failed to analyze finance transactions");
        }
    }

    /**
     * Get transactions for a specific month and year
     */
    async analyzeTransactionsByMonth(
        year: number,
        month: number,
        options?: {
            currency?: Currency;
            includeZeroAmounts?: boolean;
            expanded?: boolean;
        }
    ): Promise<TransactionTimeRangeAnalysis> {
        // Create date objects for the start and end of the month
        const startDate = startOfDay(new Date(year, month - 1, 1)); // Month is 0-indexed in JS Date
        const endDate = endOfDay(new Date(year, month, 0)); // Last day of the month

        return this.analyzeTransactionsByDateRange(startDate, endDate, options);
    }

    /**
     * Compare spending between two different time periods
     */
    async compareTimePeriods(
        firstPeriodStart: Date,
        firstPeriodEnd: Date,
        secondPeriodStart: Date,
        secondPeriodEnd: Date,
        options?: {
            currency?: Currency;
            includeZeroAmounts?: boolean;
            expanded?: boolean;
        }
    ): Promise<{
        firstPeriod: TransactionTimeRangeAnalysis;
        secondPeriod: TransactionTimeRangeAnalysis;
        differences: {
            totalSpendingDifference: number;
            totalUsdSpendingDifference: number;
            percentageChange: number;
            categoryChanges: {
                category: string;
                usdAmountDifference: number;
                percentageChange: number;
            }[];
        };
    }> {
        // Get analysis for both time periods
        const firstPeriod = await this.analyzeTransactionsByDateRange(firstPeriodStart, firstPeriodEnd, options);

        const secondPeriod = await this.analyzeTransactionsByDateRange(secondPeriodStart, secondPeriodEnd, options);

        // Calculate differences
        const totalUsdSpendingDifference = secondPeriod.totalUsdSpending - firstPeriod.totalUsdSpending;
        const percentageChange =
            firstPeriod.totalUsdSpending === 0 ? 0 : (totalUsdSpendingDifference / firstPeriod.totalUsdSpending) * 100;

        // Create a map of categories from the first period
        const categoryMap = new Map<string, number>();
        firstPeriod.spendingByCategory.forEach((category) => {
            categoryMap.set(category.category, category.totalUsdAmount);
        });

        // Calculate category changes
        const categoryChanges = secondPeriod.spendingByCategory
            .map((category) => {
                const previousAmount = categoryMap.get(category.category) || 0;
                const difference = category.totalUsdAmount - previousAmount;
                const categoryPercentageChange = previousAmount === 0 ? 0 : (difference / previousAmount) * 100;

                return {
                    category: category.category,
                    usdAmountDifference: difference,
                    percentageChange: categoryPercentageChange
                };
            })
            .sort((a, b) => Math.abs(b.usdAmountDifference) - Math.abs(a.usdAmountDifference));

        return {
            firstPeriod,
            secondPeriod,
            differences: {
                totalSpendingDifference: secondPeriod.totalUsdSpending - firstPeriod.totalUsdSpending,
                totalUsdSpendingDifference,
                percentageChange,
                categoryChanges
            }
        };
    }
}

// Export a singleton instance
export const financeAnalysisService = new FinanceAnalysisService();

/**
 * Initialize the Finance Analysis Service with LangChain tools
 */
export function initFinanceAnalysisService() {
    logger.info("Initializing Finance Analysis Service");

    // Create LangChain tool for financial analysis using the tool function
    const financialAnalysisTool = tool(
        async ({ startDate, endDate, includeZeroAmounts, expanded }) => {
            try {
                const start = startOfDay(new Date(startDate));
                const end = endOfDay(new Date(endDate));

                logger.info(`Analyzing finances for period ${startDate} to ${endDate}`);

                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    return {
                        success: false,
                        error: "Invalid date format. Please use ISO format (YYYY-MM-DD)."
                    };
                }

                const analysis = await financeAnalysisService.analyzeTransactionsByDateRange(start, end, {
                    includeZeroAmounts,
                    expanded
                });

                return {
                    data: analysis,
                    summary: `Analysis for period ${startDate} to ${endDate}: Total spending: $${analysis.totalUsdSpending.toFixed(2)}, Transactions: ${analysis.totalTransactions}`
                };
            } catch (error) {
                logger.error("Error in financial analysis tool:", error);
                return {
                    error: "Failed to analyze financial data. Please try again."
                };
            }
        },
        {
            name: "analyze_finances",
            description:
                "Provide budget review for a specific time range. Analyze financial transactions for a specific time range. Provides spending by category and overall totals.",
            schema: z.object({
                startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD)"),
                endDate: z.string().describe("End date in ISO format (YYYY-MM-DD)"),
                includeZeroAmounts: z
                    .boolean()
                    .optional()
                    .default(true)
                    .describe("Whether to include categories with zero spending"),
                expanded: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe("Whether to include individual transactions in the results")
            })
        }
    );

    // Create tool for comparing two time periods
    const comparePeriodsAnalysisTool = tool(
        async ({
            firstPeriodStart,
            firstPeriodEnd,
            secondPeriodStart,
            secondPeriodEnd,
            // currency,
            includeZeroAmounts,
            expanded
        }) => {
            try {
                const startDate1 = startOfDay(new Date(firstPeriodStart));
                const endDate1 = endOfDay(new Date(firstPeriodEnd));
                const startDate2 = startOfDay(new Date(secondPeriodStart));
                const endDate2 = endOfDay(new Date(secondPeriodEnd));

                // Validate dates
                if ([startDate1, endDate1, startDate2, endDate2].some((date) => isNaN(date.getTime()))) {
                    return {
                        success: false,
                        error: "Invalid date format. Please use ISO format (YYYY-MM-DD)."
                    };
                }

                const comparison = await financeAnalysisService.compareTimePeriods(
                    startDate1,
                    endDate1,
                    startDate2,
                    endDate2,
                    { includeZeroAmounts, expanded }
                );

                return {
                    success: true,
                    data: comparison,
                    summary: `Comparison results: Period 1 ($${comparison.firstPeriod.totalUsdSpending.toFixed(2)}) vs Period 2 ($${comparison.secondPeriod.totalUsdSpending.toFixed(2)}). Change: ${comparison.differences.percentageChange.toFixed(2)}%`
                };
            } catch (error) {
                logger.error("Error in period comparison tool:", error);
                return {
                    success: false,
                    error: "Failed to compare financial periods. Please try again."
                };
            }
        },
        {
            name: "compare_financial_periods",
            description:
                "Compare spending between two different time periods, including overall changes and changes by category.",
            schema: z.object({
                firstPeriodStart: z.string().describe("First period start date in ISO format (YYYY-MM-DD)"),
                firstPeriodEnd: z.string().describe("First period end date in ISO format (YYYY-MM-DD)"),
                secondPeriodStart: z.string().describe("Second period start date in ISO format (YYYY-MM-DD)"),
                secondPeriodEnd: z.string().describe("Second period end date in ISO format (YYYY-MM-DD)"),
                // currency: z
                //     .enum(["USD", "EUR", "GBP", "CHF", "JPY"])
                //     .optional()
                //     .describe("Filter transactions by currency"),
                includeZeroAmounts: z.boolean().optional().describe("Whether to include categories with zero spending"),
                expanded: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe("Whether to include individual transactions in the results (expanded view)")
            })
        }
    );

    langchainService.registerTools([financialAnalysisTool, comparePeriodsAnalysisTool]);
    logger.info("Financial analysis LangChain tools registered");
}
