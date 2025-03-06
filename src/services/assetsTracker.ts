import { logger } from "../utils/logger";
import { binanceService } from "./binance";
import { CoinMarketCapService } from "./coinMarketCap";
import { WalletService, BlockchainNetwork } from "./wallet";
import { db } from "./database/client";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { createCanvas } from "canvas";
import { Chart, ChartConfiguration, ChartItem } from "chart.js/auto";
import { v4 as uuidv4 } from "uuid";
import { fileService } from "./fileService";
import path from "path";
import BigNumber from "bignumber.js";
import TelegramBot from "node-telegram-bot-api";
import { langchainService } from "./langchain";

// Asset types
export enum AssetType {
    CRYPTO = "crypto",
    STOCK = "stock",
    OTHER = "other"
}

// Asset interface
export interface Asset {
    id: string;
    name: string;
    symbol: string;
    type: AssetType;
    createdAt: Date;
    updatedAt: Date;
}

// Asset value interface
export interface AssetValue {
    id: string;
    assetId: string;
    value: number;
    currency: string;
    timestamp: Date;
    createdAt: Date;
}

// Portfolio snapshot interface
export interface PortfolioSnapshot {
    id: string;
    totalValue: number;
    currency: string;
    timestamp: Date;
    createdAt: Date;
}

// Asset with current value
export interface AssetWithValue extends Asset {
    currentValue: number;
    currency: string;
    dayChange?: number;
    weekChange?: number;
    monthChange?: number;
}

export class AssetsTrackerService {
    private readonly coinMarketCapService: CoinMarketCapService;
    private readonly walletService: WalletService;

    constructor(coinMarketCapService: CoinMarketCapService, walletService: WalletService) {
        this.coinMarketCapService = coinMarketCapService;
        this.walletService = walletService;
    }

    /**
     * Add a new asset to track
     */
    async addAsset(name: string, symbol: string, type: AssetType): Promise<Asset> {
        try {
            const result = await db
                .insertInto("asset")
                .values({
                    id: uuidv4(),
                    name,
                    symbol,
                    type,
                    updatedAt: new Date()
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            logger.info(`Added new asset: ${name} (${symbol})`);
            // Convert string type from DB to AssetType enum
            return {
                ...result,
                type: result.type as AssetType
            };
        } catch (error) {
            logger.error(`Failed to add asset ${name} (${symbol}):`, error);
            throw new Error(`Failed to add asset: ${(error as Error).message}`);
        }
    }

    /**
     * Get all tracked assets
     */
    async getAllAssets(): Promise<Asset[]> {
        try {
            const assets = await db.selectFrom("asset").selectAll().execute();
            // Convert string type from DB to AssetType enum
            return assets.map((asset) => ({
                ...asset,
                type: asset.type as AssetType
            }));
        } catch (error) {
            logger.error("Failed to get assets:", error);
            return [];
        }
    }

    /**
     * Get asset by ID
     */
    async getAssetById(id: string): Promise<Asset | null> {
        try {
            const asset = await db.selectFrom("asset").selectAll().where("id", "=", id).executeTakeFirst();
            if (!asset) return null;

            // Convert string type from DB to AssetType enum
            return {
                ...asset,
                type: asset.type as AssetType
            };
        } catch (error) {
            logger.error(`Failed to get asset with ID ${id}:`, error);
            return null;
        }
    }

    /**
     * Update asset information
     */
    async updateAsset(
        id: string,
        updates: Partial<Omit<Asset, "id" | "createdAt" | "updatedAt">>
    ): Promise<Asset | null> {
        try {
            const result = await db
                .updateTable("asset")
                .set({ ...updates, updatedAt: new Date() })
                .where("id", "=", id)
                .returningAll()
                .executeTakeFirst();

            if (!result) return null;

            // Convert string type from DB to AssetType enum
            return {
                ...result,
                type: result.type as AssetType
            };
        } catch (error) {
            logger.error(`Failed to update asset ${id}:`, error);
            return null;
        }
    }

    /**
     * Delete an asset
     */
    async deleteAsset(id: string): Promise<boolean> {
        try {
            const result = await db.deleteFrom("asset").where("id", "=", id).executeTakeFirst();
            return result.numDeletedRows > 0;
        } catch (error) {
            logger.error(`Failed to delete asset ${id}:`, error);
            return false;
        }
    }

    /**
     * Record asset value
     */
    async recordAssetValue(assetId: string, value: number, currency: string = "USD"): Promise<AssetValue | null> {
        try {
            const timestamp = new Date();

            const result = await db
                .insertInto("assetValue")
                .values({
                    id: uuidv4(),
                    assetId,
                    value,
                    currency,
                    timestamp
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            logger.info(`Recorded value for asset ${assetId}: ${value} ${currency}`);

            // Convert string value from DB to number
            return {
                ...result,
                value: Number(result.value)
            };
        } catch (error) {
            logger.error(`Failed to record value for asset ${assetId}:`, error);
            return null;
        }
    }

    /**
     * Get asset value history
     */
    async getAssetValueHistory(assetId: string, days: number = 30): Promise<AssetValue[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const values = await db
                .selectFrom("assetValue")
                .selectAll()
                .where("assetId", "=", assetId)
                .where("timestamp", ">=", startDate)
                .orderBy("timestamp", "asc")
                .execute();

            // Convert string values from DB to numbers
            return values.map((value) => ({
                ...value,
                value: Number(value.value)
            }));
        } catch (error) {
            logger.error(`Failed to get value history for asset ${assetId}:`, error);
            return [];
        }
    }

    /**
     * Record portfolio snapshot
     */
    async recordPortfolioSnapshot(totalValue: number, currency: string = "USD"): Promise<PortfolioSnapshot | null> {
        try {
            const timestamp = new Date();

            const result = await db
                .insertInto("portfolioSnapshot")
                .values({
                    id: uuidv4(),
                    totalValue,
                    currency,
                    timestamp
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            logger.info(`Recorded portfolio snapshot: ${totalValue} ${currency}`);

            // Convert string totalValue from DB to number
            return {
                ...result,
                totalValue: Number(result.totalValue)
            };
        } catch (error) {
            logger.error("Failed to record portfolio snapshot:", error);
            return null;
        }
    }

    /**
     * Get portfolio snapshot history
     */
    async getPortfolioHistory(days: number = 30): Promise<PortfolioSnapshot[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const snapshots = await db
                .selectFrom("portfolioSnapshot")
                .selectAll()
                .where("timestamp", ">=", startDate)
                .orderBy("timestamp", "asc")
                .execute();

            // Convert string totalValue from DB to number
            return snapshots.map((snapshot) => ({
                ...snapshot,
                totalValue: Number(snapshot.totalValue)
            }));
        } catch (error) {
            logger.error("Failed to get portfolio history:", error);
            return [];
        }
    }

    /**
     * Update all asset values and create a portfolio snapshot
     */
    async updateAllAssetValues(): Promise<boolean> {
        try {
            // Get all assets
            const assets = await this.getAllAssets();

            // If no assets exist yet, we need to populate the assets table first
            if (assets.length === 0) {
                logger.info("No assets found. Initializing assets from Binance and wallet balances...");

                // Get Binance balances
                const binanceBalances = await binanceService().getNonZeroBalances();

                // Add assets from Binance
                for (const balance of binanceBalances) {
                    if (balance.valueUsd > 0) {
                        await this.addAsset(balance.asset, balance.asset, AssetType.CRYPTO);
                        logger.info(`Added asset from Binance: ${balance.asset}`);
                    }
                }

                // Get wallet balances
                const walletBalances = await this.walletService.getAllWalletsValueUsd();

                // Add assets from wallets
                if (walletBalances && walletBalances.wallets) {
                    for (const wallet of walletBalances.wallets) {
                        if (wallet.tokenBalances) {
                            for (const token of wallet.tokenBalances) {
                                if (token.valueUsd && token.valueUsd > 0) {
                                    await this.addAsset(token.name || token.symbol, token.symbol, AssetType.CRYPTO);
                                    logger.info(`Added asset from wallet: ${token.symbol}`);
                                }
                            }
                        }
                    }
                }

                // Get the assets again after populating
                const updatedAssets = await this.getAllAssets();

                if (updatedAssets.length === 0) {
                    logger.info("No assets found in Binance or wallets. Please add assets manually.");
                    return true;
                }

                // Continue with the updated assets list
                assets.push(...updatedAssets);
            }

            // Get crypto assets
            const cryptoAssets = assets.filter((asset) => asset.type === AssetType.CRYPTO);

            // Update crypto assets from Binance
            if (cryptoAssets.length > 0) {
                await this.updateCryptoAssetValues(cryptoAssets);
            }

            // Calculate total portfolio value
            let totalPortfolioValue = 0;

            // Get latest values for all assets
            for (const asset of assets) {
                const latestValues = await db
                    .selectFrom("assetValue")
                    .selectAll()
                    .where("assetId", "=", asset.id)
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .execute();

                if (latestValues.length > 0) {
                    totalPortfolioValue += Number(latestValues[0].value);
                }
            }

            // Record portfolio snapshot
            await this.recordPortfolioSnapshot(totalPortfolioValue);

            logger.info("Successfully updated all asset values");
            return true;
        } catch (error) {
            logger.error("Failed to update asset values:", error);
            return false;
        }
    }

    /**
     * Update crypto asset values from Binance and Wallet services
     */
    private async updateCryptoAssetValues(cryptoAssets: Asset[]): Promise<void> {
        try {
            // Get Binance balances
            const binanceBalances = await binanceService().getNonZeroBalances();

            // Get wallet balances
            const walletBalances = await this.walletService.getAllWalletsValueUsd();

            // Process Binance balances
            for (const balance of binanceBalances) {
                // Find matching asset
                const matchingAsset = cryptoAssets.find(
                    (asset) => asset.symbol.toUpperCase() === balance.asset.toUpperCase()
                );

                if (matchingAsset) {
                    // Record asset value
                    await this.recordAssetValue(matchingAsset.id, balance.valueUsd);
                } else {
                    // Create new asset if it doesn't exist
                    const newAsset = await this.addAsset(balance.asset, balance.asset, AssetType.CRYPTO);
                    await this.recordAssetValue(newAsset.id, balance.valueUsd);
                }
            }

            // Process wallet balances
            if (walletBalances && walletBalances.wallets) {
                for (const wallet of walletBalances.wallets) {
                    if (wallet.tokenBalances) {
                        for (const token of wallet.tokenBalances) {
                            // Find matching asset
                            const matchingAsset = cryptoAssets.find(
                                (asset) => asset.symbol.toUpperCase() === token.symbol.toUpperCase()
                            );

                            if (matchingAsset && token.valueUsd !== undefined) {
                                // Record asset value
                                await this.recordAssetValue(matchingAsset.id, token.valueUsd);
                            } else if (token.valueUsd !== undefined) {
                                // Create new asset if it doesn't exist
                                const newAsset = await this.addAsset(
                                    token.name || token.symbol,
                                    token.symbol,
                                    AssetType.CRYPTO
                                );
                                await this.recordAssetValue(newAsset.id, token.valueUsd);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            logger.error("Failed to update crypto asset values:", error);
            throw error;
        }
    }

    /**
     * Generate asset value change report
     */
    async generateAssetReport(): Promise<string> {
        try {
            // Get all assets with their latest values
            const assets = await this.getAllAssets();
            const assetsWithValues: AssetWithValue[] = [];

            let totalValue = 0;
            let totalDayChange = 0;
            let totalWeekChange = 0;
            let totalMonthChange = 0;

            for (const asset of assets) {
                // Get latest value
                const latestValues = await db
                    .selectFrom("assetValue")
                    .selectAll()
                    .where("assetId", "=", asset.id)
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .execute();

                if (latestValues.length === 0) continue;

                const latestValue = {
                    ...latestValues[0],
                    value: Number(latestValues[0].value)
                };

                // Get historical values
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const oneMonthAgo = new Date();
                oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

                // Get day change
                const dayValues = await db
                    .selectFrom("assetValue")
                    .selectAll()
                    .where("assetId", "=", asset.id)
                    .where("timestamp", "<=", oneDayAgo)
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .execute();

                // Get week change
                const weekValues = await db
                    .selectFrom("assetValue")
                    .selectAll()
                    .where("assetId", "=", asset.id)
                    .where("timestamp", "<=", oneWeekAgo)
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .execute();

                // Get month change
                const monthValues = await db
                    .selectFrom("assetValue")
                    .selectAll()
                    .where("assetId", "=", asset.id)
                    .where("timestamp", "<=", oneMonthAgo)
                    .orderBy("timestamp", "desc")
                    .limit(1)
                    .execute();

                const dayChange =
                    dayValues.length > 0
                        ? ((latestValue.value - Number(dayValues[0].value)) / Number(dayValues[0].value)) * 100
                        : undefined;

                const weekChange =
                    weekValues.length > 0
                        ? ((latestValue.value - Number(weekValues[0].value)) / Number(weekValues[0].value)) * 100
                        : undefined;

                const monthChange =
                    monthValues.length > 0
                        ? ((latestValue.value - Number(monthValues[0].value)) / Number(monthValues[0].value)) * 100
                        : undefined;

                assetsWithValues.push({
                    ...asset,
                    currentValue: latestValue.value,
                    currency: latestValue.currency,
                    dayChange,
                    weekChange,
                    monthChange
                });

                totalValue += latestValue.value;

                if (dayChange !== undefined) {
                    totalDayChange += (dayChange / 100) * latestValue.value;
                }

                if (weekChange !== undefined) {
                    totalWeekChange += (weekChange / 100) * latestValue.value;
                }

                if (monthChange !== undefined) {
                    totalMonthChange += (monthChange / 100) * latestValue.value;
                }
            }

            // Calculate total percentage changes
            const totalDayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;
            const totalWeekChangePercent = totalValue > 0 ? (totalWeekChange / totalValue) * 100 : 0;
            const totalMonthChangePercent = totalValue > 0 ? (totalMonthChange / totalValue) * 100 : 0;

            // Sort assets by value (descending)
            assetsWithValues.sort((a, b) => b.currentValue - a.currentValue);

            // Generate report
            let report = `*Assets Portfolio Report*\n\n`;
            report += `*Total Value:* $${totalValue.toFixed(2)}\n`;
            report += `*24h Change:* ${this.formatPercentage(totalDayChangePercent)}\n`;
            report += `*7d Change:* ${this.formatPercentage(totalWeekChangePercent)}\n`;
            report += `*30d Change:* ${this.formatPercentage(totalMonthChangePercent)}\n\n`;

            report += `*Top Assets:*\n`;

            // Add top 5 assets
            const topAssets = assetsWithValues.slice(0, 5);
            for (const asset of topAssets) {
                report += `- ${asset.name} (${asset.symbol}): $${asset.currentValue.toFixed(2)}`;
                if (asset.dayChange !== undefined) {
                    report += ` | 24h: ${this.formatPercentage(asset.dayChange)}`;
                }
                report += `\n`;
            }

            return report;
        } catch (error) {
            logger.error("Failed to generate asset report:", error);
            return "Failed to generate asset report. Please try again later.";
        }
    }

    /**
     * Generate chart image for portfolio history
     */
    async generatePortfolioChart(days: number = 30): Promise<string | null> {
        try {
            // Get portfolio history
            const history = await this.getPortfolioHistory(days);

            if (history.length < 2) {
                logger.warn("Not enough data points to generate chart");
                return null;
            }

            // Prepare data for chart
            const labels = history.map((snapshot) => {
                const date = new Date(snapshot.timestamp);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            });

            const data = history.map((snapshot) => snapshot.totalValue);

            // Create canvas
            const width = 800;
            const height = 400;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // Configure chart
            const config: ChartConfiguration = {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Portfolio Value (USD)",
                            data,
                            borderColor: "rgb(75, 192, 192)",
                            tension: 0.1,
                            fill: false
                        }
                    ]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Portfolio Value - Last ${days} Days`
                        }
                    }
                }
            };

            // Create chart
            new Chart(ctx as unknown as ChartItem, config);

            // Save chart as image
            const buffer = canvas.toBuffer("image/png");
            const filename = `portfolio_chart_${Date.now()}.png`;
            const filePath = path.join("uploads", filename);

            await fileService.saveFile(buffer, filePath);

            return filePath;
        } catch (error) {
            logger.error("Failed to generate portfolio chart:", error);
            return null;
        }
    }

    /**
     * Format percentage value with sign and 2 decimal places
     */
    private formatPercentage(value: number | undefined): string {
        if (value === undefined) return "N/A";

        const sign = value >= 0 ? "+" : "";
        return `${sign}${value.toFixed(2)}%`;
    }

    /**
     * Define scheduled message for updating assets and generating reports
     * This method returns a configuration object that can be used by the scheduler
     */
    defineScheduledAssetUpdate(chatIds: number[], bot: TelegramBot) {
        return {
            // Runs every day at 10AM for assets tracking
            cronExpression: "0 10 * * *",
            messageGenerator: async () => {
                try {
                    // Update all asset values
                    await this.updateAllAssetValues();

                    // Generate report
                    const report = await this.generateAssetReport();

                    // Generate chart
                    const chartPath = await this.generatePortfolioChart(30);

                    // If chart was generated, send it as a photo
                    if (chartPath) {
                        // We'll send the chart separately after the text message
                        setTimeout(async () => {
                            try {
                                for (const chatId of chatIds) {
                                    await bot.sendPhoto(chatId, chartPath);
                                }
                            } catch (err) {
                                logger.error(`Failed to send asset chart: ${err}`);
                            }
                        }, 1000);
                    }

                    return report;
                } catch (error) {
                    if (error instanceof Error) {
                        return `Sorry, couldn't update asset values: ${error.message}`;
                    }
                    return "Sorry, couldn't update asset values";
                }
            },
            chatIds
        };
    }

    /**
     * Manually trigger asset update and reporting process for testing
     * This runs the same logic as the scheduled task but can be called on demand
     */
    async runAssetUpdateNow(chatIds: number[], bot: TelegramBot): Promise<string> {
        try {
            // Update all asset values
            await this.updateAllAssetValues();

            // Generate report
            const report = await this.generateAssetReport();

            // Generate chart
            const chartPath = await this.generatePortfolioChart(30);

            // If chart was generated, send it as a photo
            if (chartPath) {
                for (const chatId of chatIds) {
                    try {
                        await bot.sendPhoto(chatId, chartPath);
                    } catch (err) {
                        logger.error(`Failed to send asset chart to ${chatId}: ${err}`);
                    }
                }
            }

            // Return the report text
            return report;
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Sorry, couldn't update asset values: ${error.message}`
                    : "Sorry, couldn't update asset values";
            logger.error("Error in runAssetUpdateNow:", error);
            return errorMessage;
        }
    }

    /**
     * LangChain tool to get asset portfolio report
     */
    async getAssetPortfolioReport() {
        try {
            const report = await this.generateAssetReport();
            return report;
        } catch (error) {
            return `Error getting asset portfolio report: ${(error as Error).message}`;
        }
    }
}

// Singleton instance
let assetsTrackerServiceInstance: AssetsTrackerService | null = null;

/**
 * Initialize assets tracker service
 */
export function initAssetsTrackerService(
    coinMarketCapService: CoinMarketCapService,
    walletService: WalletService
): AssetsTrackerService {
    if (!assetsTrackerServiceInstance) {
        assetsTrackerServiceInstance = new AssetsTrackerService(coinMarketCapService, walletService);

        // Register LangChain tools
        registerAssetsTrackerTools(assetsTrackerServiceInstance);
    }
    return assetsTrackerServiceInstance;
}

/**
 * Register LangChain tools for assets tracker
 */
function registerAssetsTrackerTools(assetsTrackerService: AssetsTrackerService) {
    // Create a tool for getting asset portfolio report
    const getAssetReportTool = tool(
        async () => {
            return await assetsTrackerService.getAssetPortfolioReport();
        },
        {
            name: "get_asset_portfolio_report",
            description: "Get a report of your asset portfolio with current values and changes",
            schema: z.object({})
        }
    );

    // Create a tool for running asset update immediately
    const runAssetUpdateTool = tool(
        async () => {
            // We can't access the bot instance here, so we'll just generate the report
            // The actual update will be triggered by the bot command
            await assetsTrackerService.updateAllAssetValues();
            return "Asset values have been updated. Generating report...";
        },
        {
            name: "run_asset_update_now",
            description: "Run the asset update process immediately to update all asset values and generate a report",
            schema: z.object({})
        }
    );

    // Register tools with LangChain service
    langchainService.registerTools([getAssetReportTool, runAssetUpdateTool]);
}

/**
 * Export singleton instance
 */
export function assetsTrackerService(): AssetsTrackerService {
    if (!assetsTrackerServiceInstance) {
        throw new Error("Assets tracker service not initialized");
    }
    return assetsTrackerServiceInstance;
}
