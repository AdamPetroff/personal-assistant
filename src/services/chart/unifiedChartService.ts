import { getChartService, UnifiedChartDataPoint } from "./chartService";
import { CryptoPortfolioRepository, PortfolioChartDataPoint } from "../database/repositories/CryptoPortfolioRepository";
import { financeSourceRepository, FinanceChartDataPoint } from "../database/repositories/FinanceSourceRepository";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";
import path from "path";

// Create a repository instance
const cryptoPortfolioRepository = new CryptoPortfolioRepository();

/**
 * Generate a unified chart showing both crypto and finance data
 * @param options Options for chart generation
 * @returns Path to the generated chart image
 */
export async function generateUnifiedChart(options: {
    startDate?: Date;
    endDate?: Date;
    title?: string;
    showCrypto?: boolean;
    showFinance?: boolean;
    showIndividualSources?: boolean;
    width?: number;
    height?: number;
}): Promise<Buffer> {
    try {
        const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const endDate = options.endDate || new Date();
        const showCrypto = options.showCrypto !== undefined ? options.showCrypto : true;
        const showFinance = options.showFinance !== undefined ? options.showFinance : true;

        // Get data from repositories
        const cryptoData = showCrypto ? await cryptoPortfolioRepository.getChartData(startDate, endDate) : [];

        const financeData = showFinance ? await financeSourceRepository.getFinanceChartData(startDate, endDate) : [];

        if (cryptoData.length === 0 && financeData.length === 0) {
            throw new Error("No data available for chart generation in the specified date range");
        }

        // Create a map of all timestamps from all datasets
        const allTimestamps = new Set<string>();

        // Collect all unique timestamps
        cryptoData.forEach((point) => allTimestamps.add(point.timestamp.toISOString()));
        financeData.forEach((point) => allTimestamps.add(point.timestamp.toISOString()));

        // Convert to array and sort chronologically
        const sortedTimestamps = Array.from(allTimestamps)
            .map((ts) => new Date(ts))
            .sort((a, b) => a.getTime() - b.getTime());

        // Create mapping of timestamps to crypto data for fast lookup
        const cryptoMap = new Map<string, PortfolioChartDataPoint>();
        cryptoData.forEach((point) => {
            cryptoMap.set(point.timestamp.toISOString(), point);
        });

        // Create mapping of timestamps to finance data for fast lookup
        const financeMap = new Map<string, FinanceChartDataPoint>();
        financeData.forEach((point) => {
            financeMap.set(point.timestamp.toISOString(), point);
        });

        // Create unified data with interpolation for missing points
        const unifiedData: UnifiedChartDataPoint[] = [];

        for (const timestamp of sortedTimestamps) {
            const timestampStr = timestamp.toISOString();
            const dataPoint: UnifiedChartDataPoint = { timestamp };

            // Add crypto data if available directly
            if (cryptoMap.has(timestampStr)) {
                const cryptoPoint = cryptoMap.get(timestampStr)!;
                dataPoint.cryptoData = {
                    totalValueUsd: cryptoPoint.totalValueUsd,
                    walletsValueUsd: cryptoPoint.walletsValueUsd,
                    exchangeValueUsd: cryptoPoint.exchangeValueUsd
                };
            }
            // Otherwise only add interpolated crypto data if we should show crypto
            else if (showCrypto && cryptoData.length > 0) {
                // Find closest points before and after this timestamp
                const beforePoints = cryptoData
                    .filter((p) => p.timestamp.getTime() < timestamp.getTime())
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                const afterPoints = cryptoData
                    .filter((p) => p.timestamp.getTime() > timestamp.getTime())
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                // If we have points both before and after, interpolate
                if (beforePoints.length > 0 && afterPoints.length > 0) {
                    const before = beforePoints[0];
                    const after = afterPoints[0];

                    // Calculate weights for interpolation
                    const totalTimespan = after.timestamp.getTime() - before.timestamp.getTime();
                    const timeFromBefore = timestamp.getTime() - before.timestamp.getTime();
                    const ratio = totalTimespan > 0 ? timeFromBefore / totalTimespan : 0;

                    // Interpolate values
                    dataPoint.cryptoData = {
                        totalValueUsd: before.totalValueUsd + ratio * (after.totalValueUsd - before.totalValueUsd),
                        walletsValueUsd:
                            before.walletsValueUsd + ratio * (after.walletsValueUsd - before.walletsValueUsd),
                        exchangeValueUsd:
                            before.exchangeValueUsd + ratio * (after.exchangeValueUsd - before.exchangeValueUsd)
                    };
                }
                // If only points before this timestamp, use the last value (no extrapolation)
                else if (beforePoints.length > 0) {
                    const before = beforePoints[0];
                    dataPoint.cryptoData = {
                        totalValueUsd: before.totalValueUsd,
                        walletsValueUsd: before.walletsValueUsd,
                        exchangeValueUsd: before.exchangeValueUsd
                    };
                }
                // If only points after this timestamp, use the first value (no extrapolation)
                else if (afterPoints.length > 0) {
                    const after = afterPoints[0];
                    dataPoint.cryptoData = {
                        totalValueUsd: after.totalValueUsd,
                        walletsValueUsd: after.walletsValueUsd,
                        exchangeValueUsd: after.exchangeValueUsd
                    };
                }
                // No interpolation possible
            }

            // Add finance data if available directly
            if (financeMap.has(timestampStr)) {
                const financePoint = financeMap.get(timestampStr)!;
                dataPoint.financeData = {
                    totalBalance: financePoint.totalBalance,
                    sourceBalances: financePoint.sourceBalances
                };
            }
            // Otherwise only add interpolated finance data if we should show finance
            else if (showFinance && financeData.length > 0) {
                // Find closest points before and after this timestamp
                const beforePoints = financeData
                    .filter((p) => p.timestamp.getTime() < timestamp.getTime())
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                const afterPoints = financeData
                    .filter((p) => p.timestamp.getTime() > timestamp.getTime())
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                // If we have points both before and after, interpolate
                if (beforePoints.length > 0 && afterPoints.length > 0) {
                    const before = beforePoints[0];
                    const after = afterPoints[0];

                    // Calculate weights for interpolation
                    const totalTimespan = after.timestamp.getTime() - before.timestamp.getTime();
                    const timeFromBefore = timestamp.getTime() - before.timestamp.getTime();
                    const ratio = totalTimespan > 0 ? timeFromBefore / totalTimespan : 0;

                    // Interpolate total balance
                    const totalBalance = before.totalBalance + ratio * (after.totalBalance - before.totalBalance);

                    // Collect all unique source IDs
                    const allSourceIds = new Set<string>();
                    before.sourceBalances.forEach((source) => allSourceIds.add(source.sourceId));
                    after.sourceBalances.forEach((source) => allSourceIds.add(source.sourceId));

                    // Interpolate source balances
                    const sourceBalances = Array.from(allSourceIds).map((sourceId) => {
                        const beforeSource = before.sourceBalances.find((s) => s.sourceId === sourceId);
                        const afterSource = after.sourceBalances.find((s) => s.sourceId === sourceId);

                        // If source exists in both points, interpolate
                        if (beforeSource && afterSource) {
                            const balance = beforeSource.balance + ratio * (afterSource.balance - beforeSource.balance);
                            return {
                                sourceId,
                                sourceName: beforeSource.sourceName,
                                sourceType: beforeSource.sourceType,
                                balance
                            };
                        }
                        // If source only exists in before, use that value
                        else if (beforeSource) {
                            return beforeSource;
                        }
                        // If source only exists in after, use that value
                        else if (afterSource) {
                            return afterSource;
                        }

                        // Should never get here given how we build allSourceIds
                        return {
                            sourceId,
                            sourceName: "Unknown",
                            sourceType: "unknown",
                            balance: 0
                        };
                    });

                    dataPoint.financeData = {
                        totalBalance,
                        sourceBalances
                    };
                }
                // If only points before this timestamp, use the last value
                else if (beforePoints.length > 0) {
                    const before = beforePoints[0];
                    dataPoint.financeData = {
                        totalBalance: before.totalBalance,
                        sourceBalances: before.sourceBalances
                    };
                }
                // If only points after this timestamp, use the first value
                else if (afterPoints.length > 0) {
                    const after = afterPoints[0];
                    dataPoint.financeData = {
                        totalBalance: after.totalBalance,
                        sourceBalances: after.sourceBalances
                    };
                }
                // No interpolation possible
            }

            unifiedData.push(dataPoint);
        }

        // Get chart service and generate the unified chart
        const chartService = getChartService();

        const chartBuffer = await chartService.generateUnifiedChart(unifiedData, {
            title: options.title || "Unified Asset Overview",
            showCrypto: options.showCrypto,
            showFinance: options.showFinance,
            showIndividualSources: options.showIndividualSources,
            width: options.width,
            height: options.height
        });

        return chartBuffer;
    } catch (error) {
        logger.error("Failed to generate unified chart:", error);
        throw new Error("Failed to generate unified chart");
    }
}
