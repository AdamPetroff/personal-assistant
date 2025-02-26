import axios from "axios";
import { logger } from "../utils/logger";
import { openaiService } from "./openai";

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

export class CoinMarketCapService {
    private readonly baseUrl = "https://pro-api.coinmarketcap.com/v2";
    private readonly apiKey = process.env.COIN_MARKET_CAP_API_KEY;

    /**
     * Get current price and 24h change for a cryptocurrency
     */
    async getTokenPrice(symbol: string): Promise<{ price: number; change24h: number | null }> {
        try {
            const response = await axios.get<CoinMarketCapQuote>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                params: {
                    symbol: symbol.toUpperCase()
                },
                headers: {
                    "X-CMC_PRO_API_KEY": this.apiKey
                }
            });

            const tokenData = response.data.data[symbol.toUpperCase()].at(0);
            if (!tokenData) {
                throw new Error(`Price not found for token: ${symbol}`);
            }

            return {
                price: tokenData.quote.USD.price,
                change24h: tokenData.quote.USD.percent_change_24h
            };
        } catch (error) {
            logger.error(`Failed to fetch price for ${symbol}:`, error);
            throw new Error(`Failed to fetch price for ${symbol}`);
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

    // Register the capability with OpenAI service
    openaiService.registerTool({
        type: "function",
        function: {
            name: "get_crypto_price",
            description: "Get the current price and 24h change of a cryptocurrency",
            parameters: {
                type: "object",
                properties: {
                    symbol: {
                        type: "string",
                        description: "The cryptocurrency symbol (e.g., BTC, ETH, SOL)"
                    }
                },
                required: ["symbol"]
            }
        },
        handler: async (parameters) => {
            const { symbol } = parameters;
            const { price, change24h } = await coinMarketCapService.getTokenPrice(symbol);
            return coinMarketCapService.formatPriceMessage(symbol, price, change24h);
        }
    });
}
