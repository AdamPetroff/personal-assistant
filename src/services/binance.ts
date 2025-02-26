import axios from "axios";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { openaiService } from "./openai";
import { CoinMarketCapService } from "./coinMarketCap";
import BigNumber from "bignumber.js";

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

// Map of fiat currencies to their USD exchange rates
// These will need to be updated periodically or fetched from an API
const FIAT_USD_RATES: Record<string, number> = {
    EUR: 1.08, // 1 EUR = 1.08 USD (approximate)
    GBP: 1.27, // 1 GBP = 1.27 USD (approximate)
    JPY: 0.0067, // 1 JPY = 0.0067 USD (approximate)
    AUD: 0.66, // 1 AUD = 0.66 USD (approximate)
    CAD: 0.74, // 1 CAD = 0.74 USD (approximate)
    CHF: 1.13, // 1 CHF = 1.13 USD (approximate)
    CNY: 0.14, // 1 CNY = 0.14 USD (approximate)
    RUB: 0.011 // 1 RUB = 0.011 USD (approximate)
};

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
            throw new Error("Failed to fetch Binance account info");
        }
    }

    /**
     * Check if an asset is a fiat currency
     */
    private isFiatCurrency(asset: string): boolean {
        return Object.keys(FIAT_USD_RATES).includes(asset);
    }

    /**
     * Get USD value for a fiat currency
     */
    private getFiatUsdValue(asset: string, amount: BigNumber): number {
        const rate = FIAT_USD_RATES[asset];
        if (!rate) {
            logger.warn(`No USD conversion rate found for fiat currency: ${asset}`);
            return 0;
        }
        return amount.times(rate).toNumber();
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
                if (balance.asset === "TRX") {
                    console.log(balance);
                }
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
                const valueUsd = this.getFiatUsdValue(asset, total);
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

                    // Process each token with the fetched prices
                    for (const { asset, total } of cryptoBalances) {
                        const priceData = tokenPrices[asset.toUpperCase()];
                        if (asset === "TRX") {
                            console.log(total.toString(), priceData.price, cryptoBalances);
                        }

                        if (priceData) {
                            const valueUsd = total.times(priceData.price).toNumber();

                            if (valueUsd >= this.minUsdValueToShow) {
                                processedBalances.push({
                                    asset,
                                    total,
                                    valueUsd
                                });
                            }
                        } else {
                            logger.warn(`No price data found for ${asset}`);
                        }
                    }
                } catch (error) {
                    logger.error("Failed to fetch batch prices:", error);
                    // If batch request fails, we won't add any crypto tokens
                }
            }

            // Sort by USD value (descending)
            return processedBalances.sort((a, b) => b.valueUsd - a.valueUsd);
        } catch (error) {
            logger.error("Failed to process Binance balances:", error);
            throw new Error("Failed to process Binance balances");
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
    formatBalanceReport(balances: ProcessedBalance[]): string {
        const totalUsd = balances.reduce((sum, balance) => sum + balance.valueUsd, 0);

        let report = `*Binance Account Balance*\n\n`;
        report += `*Total Value:* $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

        report += "*Holdings:*\n";
        for (const balance of balances) {
            const formattedValue = balance.valueUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            const formattedAmount = balance.total.toFixed(balance.total.isGreaterThan(100) ? 2 : 6);
            report += `• ${balance.asset}: ${formattedAmount} ($${formattedValue})\n`;
        }

        return report;
    }
}

// Create a singleton instance
let binanceServiceInstance: BinanceService | null = null;

export function initBinanceService(coinMarketCapService: CoinMarketCapService): BinanceService {
    if (!binanceServiceInstance) {
        binanceServiceInstance = new BinanceService(coinMarketCapService);

        // Register the capability with OpenAI service
        openaiService.registerTool({
            type: "function",
            function: {
                name: "get_binance_balance",
                description: "Get your Binance account balance and holdings",
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                }
            },
            handler: async () => {
                const balances = await binanceServiceInstance!.getNonZeroBalances();
                return binanceServiceInstance!.formatBalanceReport(balances);
            }
        });
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
