import axios from "axios";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { coinMarketCapService, CoinMarketCapService } from "./coinMarketCap";
import { exchangeRateService } from "./exchangeRate";
import BigNumber from "bignumber.js";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Interface for Binance account balance
interface BinanceBalance {
    asset: string;
    free: string;
    locked: string;
}

// Interface for processed balance with USD value
interface ProcessedBalance {
    asset: string;
    total: BigNumber;
    valueUsd: number;
}

// List of supported fiat currencies
const SUPPORTED_FIAT_CURRENCIES = ["EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "RUB", "CZK"];

export class BinanceService {
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly baseUrl: string = "https://api.binance.com";
    private readonly coinMarketCapService: CoinMarketCapService;
    private readonly minUsdValueToShow: number = 10; // Minimum USD value to include in reports

    constructor(coinMarketCapService: CoinMarketCapService) {
        this.apiKey = env.BINANCE_API_KEY;
        this.apiSecret = env.BINANCE_API_SECRET;
        this.coinMarketCapService = coinMarketCapService;

        if (!this.apiKey || !this.apiSecret) {
            logger.warn("Binance API credentials not provided. Binance service will not work.");
        }
    }

    /**
     * Generate signature for Binance API request
     */
    private generateSignature(queryString: string): string {
        return crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex");
    }

    /**
     * Get account information from Binance
     */
    async getAccountInfo(): Promise<{ balances: BinanceBalance[] }> {
        try {
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = this.generateSignature(queryString);

            const response = await axios.get(`${this.baseUrl}/api/v3/account`, {
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                },
                params: {
                    timestamp,
                    signature
                }
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to fetch Binance account info:", error);
            throw new Error(`Failed to fetch Binance account info: ${(error as Error).message}`);
        }
    }

    /**
     * Check if an asset is a fiat currency
     */
    private isFiatCurrency(asset: string): boolean {
        return SUPPORTED_FIAT_CURRENCIES.includes(asset);
    }

    /**
     * Get USD value for a fiat currency
     */
    private async getFiatUsdValue(asset: string, amount: BigNumber): Promise<number> {
        try {
            const convertedAmount = await exchangeRateService.convertCurrency(amount, asset, "USD");
            return convertedAmount.toNumber();
        } catch (error) {
            logger.warn(`Failed to convert ${asset} to USD: ${error}`);
            return 0;
        }
    }

    /**
     * Get all balances with non-zero amounts
     */
    async getNonZeroBalances(): Promise<ProcessedBalance[]> {
        try {
            const { balances } = await this.getAccountInfo();

            // Filter out zero balances
            const nonZeroBalances = balances.filter((balance) => {
                const total = new BigNumber(balance.free).plus(balance.locked);
                return !total.isZero();
            });

            // Process balances with USD values
            const processedBalances: ProcessedBalance[] = [];

            // Separate fiat currencies and crypto tokens
            const fiatBalances: { asset: string; total: BigNumber }[] = [];
            const cryptoBalances: { asset: string; total: BigNumber }[] = [];

            for (const balance of nonZeroBalances) {
                const total = new BigNumber(balance.free).plus(balance.locked);

                if (this.isFiatCurrency(balance.asset)) {
                    fiatBalances.push({ asset: balance.asset, total });
                } else {
                    // Convert LDBTC to BTC
                    const asset = balance.asset === "LDBTC" ? "BTC" : balance.asset;

                    cryptoBalances.push({ asset, total });
                }
            }

            // Process fiat currencies
            for (const { asset, total } of fiatBalances) {
                const valueUsd = await this.getFiatUsdValue(asset, total);
                if (valueUsd >= this.minUsdValueToShow) {
                    processedBalances.push({
                        asset,
                        total,
                        valueUsd
                    });
                }
            }

            // Process crypto tokens in batch
            if (cryptoBalances.length > 0) {
                // Get all symbols for batch request
                const symbols = cryptoBalances.map((item) => item.asset);

                try {
                    // Fetch all prices in a single API call
                    const tokenPrices = await this.coinMarketCapService.getMultipleTokenPrices(symbols);

                    // Process each token with its price
                    for (const { asset, total } of cryptoBalances) {
                        const priceData = tokenPrices[asset.toUpperCase()];

                        if (priceData) {
                            const valueUsd = total.times(priceData.price).toNumber();

                            if (valueUsd >= this.minUsdValueToShow) {
                                processedBalances.push({
                                    asset,
                                    total,
                                    valueUsd
                                });
                            }
                        }
                    }
                } catch (error) {
                    logger.error("Failed to fetch crypto prices:", error);
                }
            }

            // Sort by USD value (descending)
            return processedBalances.sort((a, b) => b.valueUsd - a.valueUsd);
        } catch (error) {
            logger.error("Failed to get Binance balances:", error);
            return [];
        }
    }

    /**
     * Get total USD value of all Binance holdings
     */
    async getTotalBalanceUsd(): Promise<number> {
        const balances = await this.getNonZeroBalances();
        return balances.reduce((total, balance) => total + balance.valueUsd, 0);
    }

    /**
     * Format balance report for display
     */
    formatBalanceReport(balances: ProcessedBalance[], displayCurrency: string = "USD"): string {
        const totalUsd = balances.reduce((sum, balance) => sum + balance.valueUsd, 0);

        let report = `*Binance Account Balance*\n\n`;

        // Format total value with currency symbol
        const formattedTotal = exchangeRateService.formatCurrencyAmount(totalUsd, displayCurrency);
        report += `*Total Value:* ${formattedTotal}\n\n`;

        report += "*Holdings:*\n";
        for (const balance of balances) {
            // Format the asset amount
            const formattedAmount = balance.total.toFixed(balance.total.isGreaterThan(100) ? 2 : 6);

            // Format the USD value with currency symbol
            const formattedValue = exchangeRateService.formatCurrencyAmount(balance.valueUsd, displayCurrency);

            report += `• ${balance.asset}: ${formattedAmount} (${formattedValue})\n`;
        }

        return report;
    }

    /**
     * Format balance report with multiple currencies
     */
    async formatMultiCurrencyReport(
        balances: ProcessedBalance[],
        currencies: string[] = ["USD", "EUR", "CZK"]
    ): Promise<string> {
        const totalUsd = balances.reduce((sum, balance) => sum + balance.valueUsd, 0);

        let report = `*Binance Account Balance*\n\n`;

        // Add total value in multiple currencies
        report += "*Total Value:*\n";

        for (const currency of currencies) {
            try {
                const convertedAmount = await exchangeRateService.convertCurrency(totalUsd, "USD", currency);
                const formattedAmount = exchangeRateService.formatCurrencyAmount(convertedAmount, currency);
                report += `• ${formattedAmount}\n`;
            } catch (error) {
                logger.warn(`Failed to convert total to ${currency}:`, error);
            }
        }

        report += "\n*Holdings:*\n";

        for (const balance of balances) {
            // Format the asset amount
            const formattedAmount = balance.total.toFixed(balance.total.isGreaterThan(100) ? 2 : 6);

            // Format the value in primary currency (USD)
            const primaryValue = exchangeRateService.formatCurrencyAmount(balance.valueUsd, "USD");

            report += `• ${balance.asset}: ${formattedAmount} (${primaryValue})\n`;
        }

        return report;
    }

    /**
     * Get total balance in a specific currency
     */
    async getTotalBalanceInCurrency(currency: string = "USD"): Promise<{
        amount: number;
        formatted: string;
    }> {
        try {
            // Get total in USD first
            const totalUsd = await this.getTotalBalanceUsd();

            // If target currency is USD, no conversion needed
            if (currency.toUpperCase() === "USD") {
                return {
                    amount: totalUsd,
                    formatted: exchangeRateService.formatCurrencyAmount(totalUsd, "USD")
                };
            }

            // Convert to target currency
            const convertedAmount = await exchangeRateService.convertCurrency(totalUsd, "USD", currency);

            return {
                amount: convertedAmount.toNumber(),
                formatted: exchangeRateService.formatCurrencyAmount(convertedAmount, currency)
            };
        } catch (error) {
            logger.error(`Failed to get balance in ${currency}:`, error);
            throw new Error(`Failed to get balance in ${currency}`);
        }
    }
}

// Create a singleton instance
let binanceServiceInstance: BinanceService | null = null;

export function initBinanceService(): BinanceService {
    if (!binanceServiceInstance) {
        binanceServiceInstance = new BinanceService(coinMarketCapService());

        // Create LangChain tool for Binance balance
        const binanceBalanceTool = tool(
            async () => {
                const balances = await binanceServiceInstance!.getNonZeroBalances();
                return binanceServiceInstance!.formatBalanceReport(balances);
            },
            {
                name: "get_binance_balance",
                description: "Get your Binance account balance and holdings",
                schema: z.object({})
            }
        );

        // Register the tool with LangChain service
        langchainService.registerTools([binanceBalanceTool]);
    }

    return binanceServiceInstance;
}

// Export the singleton instance
export const binanceService = (): BinanceService => {
    if (!binanceServiceInstance) {
        throw new Error("Binance service not initialized. Call initBinanceService first.");
    }
    return binanceServiceInstance;
};
