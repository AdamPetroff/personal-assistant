import axios from "axios";
import { logger } from "../utils/logger";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

interface CoinMarketCapQuote {
    data: {
        [key: string]: {
            quote: {
                USD: {
                    price: number;
                    percent_change_24h: number;
                };
            };
        }[];
    };
}

interface TokenPriceData {
    price: number;
    change24h: number | null;
}

export class CoinMarketCapService {
    private readonly baseUrl = "https://pro-api.coinmarketcap.com/v2";
    private readonly apiKey = process.env.COIN_MARKET_CAP_API_KEY;
    private readonly maxBatchSize = 100; // CoinMarketCap allows up to 100 symbols per request

    // Cache to store recently fetched prices (valid for 5 minutes)
    private priceCache: Map<string, { data: TokenPriceData; timestamp: number }> = new Map();
    private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    /**
     * Get current price and 24h change for a single cryptocurrency
     */
    async getTokenPrice(symbol: string): Promise<TokenPriceData> {
        // Check cache first
        const cachedData = this.priceCache.get(symbol.toUpperCase());
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheTTL) {
            return cachedData.data;
        }

        // If not in cache, fetch it (using the batch method for consistency)
        const prices = await this.getMultipleTokenPrices([symbol]);
        return prices[symbol.toUpperCase()];
    }

    /**
     * Get current prices and 24h changes for multiple cryptocurrencies in a single API call
     */
    async getMultipleTokenPrices(symbols: string[]): Promise<Record<string, TokenPriceData>> {
        if (symbols.length === 0) {
            return {};
        }

        try {
            // Convert all symbols to uppercase
            const upperSymbols = symbols.map((s) => s.toUpperCase());

            // Remove duplicates
            const uniqueSymbols = [...new Set(upperSymbols)];

            // Check which symbols we need to fetch (not in cache or cache expired)
            const symbolsToFetch: string[] = [];
            const result: Record<string, TokenPriceData> = {};

            for (const symbol of uniqueSymbols) {
                const cachedData = this.priceCache.get(symbol);
                if (cachedData && Date.now() - cachedData.timestamp < this.cacheTTL) {
                    // Use cached data if available and not expired
                    result[symbol] = cachedData.data;
                } else {
                    // Need to fetch this symbol
                    symbolsToFetch.push(symbol);
                }
            }

            // If all data was in cache, return it
            if (symbolsToFetch.length === 0) {
                return result;
            }

            // Process symbols in batches to respect API limits
            for (let i = 0; i < symbolsToFetch.length; i += this.maxBatchSize) {
                const batch = symbolsToFetch.slice(i, i + this.maxBatchSize);
                const symbolsParam = batch.join(",");

                const response = await axios.get<CoinMarketCapQuote>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                    params: {
                        symbol: symbolsParam
                    },
                    headers: {
                        "X-CMC_PRO_API_KEY": this.apiKey
                    }
                });

                // Process the response for each symbol
                for (const symbol of batch) {
                    try {
                        const tokenDataArray = response.data.data[symbol];
                        if (!tokenDataArray || tokenDataArray.length === 0) {
                            logger.warn(`No data returned for token: ${symbol}`);
                            continue;
                        }

                        const tokenData = tokenDataArray[0];
                        const priceData: TokenPriceData = {
                            price: tokenData.quote.USD.price,
                            change24h: tokenData.quote.USD.percent_change_24h
                        };

                        // Update the result and cache
                        result[symbol] = priceData;
                        this.priceCache.set(symbol, {
                            data: priceData,
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        logger.error(`Error processing data for token ${symbol}:`, error);
                    }
                }
            }

            return result;
        } catch (error) {
            const symbolsList = symbols.join(", ");
            logger.error(`Failed to fetch prices for tokens [${symbolsList}]:`, error);
            throw new Error(`Failed to fetch prices for tokens [${symbolsList}]`);
        }
    }

    /**
     * Format price response for user display
     */
    formatPriceMessage(symbol: string, price: number, change24h: number | null): string {
        const formattedPrice = price.toLocaleString();
        const symbolBold = `*${symbol.toUpperCase()}*`;

        let changeStr = "";
        if (change24h !== null) {
            const changePrefix = change24h > 0 ? "+" : "";
            const changeValue = change24h.toFixed(2);
            const changeColor = change24h > 0 ? "🟢" : "🔴";
            changeStr = ` ${changeColor} ${changePrefix}${changeValue}% 24h`;
        }

        return `${symbolBold}: $${formattedPrice}${changeStr}`.trim();
    }
}

export function initCoinMarketCapService() {
    const coinMarketCapService = new CoinMarketCapService();

    // Create LangChain tool for crypto price
    const cryptoPriceTool = tool(
        async ({ symbol }) => {
            try {
                const { price, change24h } = await coinMarketCapService.getTokenPrice(symbol.toUpperCase());
                return coinMarketCapService.formatPriceMessage(symbol.toUpperCase(), price, change24h);
            } catch (error) {
                logger.error(`Error fetching price for ${symbol}:`, error);
                return `Sorry, I couldn't fetch the price for ${symbol}. The symbol may be invalid or there might be an issue with the API.`;
            }
        },
        {
            name: "get_crypto_price",
            description: "Get the current price and 24h change of a cryptocurrency",
            schema: z.object({
                symbol: z.string().describe("The cryptocurrency symbol (e.g., BTC, ETH, SOL)")
            })
        }
    );

    // Register the tool with LangChain service
    langchainService.registerTools([cryptoPriceTool]);

    return coinMarketCapService;
}
