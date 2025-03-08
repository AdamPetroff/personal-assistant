import axios from "axios";
import { logger } from "../utils/logger";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "../config/constants";
import { BlockchainNetwork } from "./wallet";
import { NETWORK_IDS } from "./crypto";
import { cryptoService, TokenData as CryptoTokenData } from "./crypto";

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

// Interface for token details from v2 API
interface CoinMarketCapInfoResponse {
    status: {
        timestamp: string;
        error_code: number;
        error_message: string | null;
        elapsed: number;
        credit_count: number;
    };
    data: {
        [symbol: string]: TokenDetailsV2[];
    };
}

interface TokenDetailsV2 {
    id: number;
    name: string;
    symbol: string;
    category: string;
    description: string;
    slug: string;
    logo: string;
    subreddit: string;
    notice: string;
    tags: string[];
    tag_names: string[];
    tag_groups: string[];
    urls: {
        website: string[];
        twitter: string[];
        message_board: string[];
        chat: string[];
        facebook: string[];
        explorer: string[];
        reddit: string[];
        technical_doc: string[];
        source_code: string[];
        announcement: string[];
    };
    platform: null | {
        id: number;
        name: string;
        symbol: string;
        slug: string;
        token_address: string;
    };
    date_added: string;
    twitter_username: string;
    is_hidden: number;
    date_launched: string | null;
    contract_address: Array<{
        contract_address: string;
        platform: {
            name: string;
            coin: {
                id: string;
                name: string;
                symbol: string;
                slug: string;
            };
        };
    }>;
    self_reported_circulating_supply: number | null;
    self_reported_tags: string[] | null;
    self_reported_market_cap: number | null;
    infinite_supply: boolean;
}

// For backward compatibility, keep the old interface but extend it
interface TokenDetails extends Partial<TokenDetailsV2> {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    rank: number;
    is_active: number;
    category: string;
    contractAddress?: string;
    network?: BlockchainNetwork;
    networkId?: number;
    decimals?: number;
    onChainSymbol?: string;
    onChainName?: string;
}

// Network mapping from CoinMarketCap platform names to our BlockchainNetwork enum
const NETWORK_MAPPING: Record<
    string,
    {
        network: BlockchainNetwork;
        chainId: string;
        decimals: number;
    }
> = {
    Ethereum: {
        network: BlockchainNetwork.ETHEREUM,
        chainId: "1027",
        decimals: 18
    },
    "BNB Smart Chain (BEP20)": {
        network: BlockchainNetwork.BSC,
        chainId: "1839",
        decimals: 18
    },
    Polygon: {
        network: BlockchainNetwork.POLYGON,
        chainId: "3890",
        decimals: 18
    },
    Solana: {
        network: BlockchainNetwork.SOLANA,
        chainId: "5426",
        decimals: 9
    },
    Arbitrum: {
        network: BlockchainNetwork.ARBITRUM,
        chainId: "11841",
        decimals: 18
    },
    Optimism: {
        network: BlockchainNetwork.OPTIMISM,
        chainId: "11840",
        decimals: 18
    },
    "Avalanche C-Chain": {
        network: BlockchainNetwork.AVALANCHE,
        chainId: "5805",
        decimals: 18
    },
    Base: {
        network: BlockchainNetwork.BASE,
        chainId: "27716",
        decimals: 18
    }
};

export class CoinMarketCapService {
    private readonly baseUrl = "https://pro-api.coinmarketcap.com/v2";
    private readonly apiKey = env.COIN_MARKET_CAP_API_KEY;
    private readonly maxBatchSize = 100; // CoinMarketCap allows up to 100 symbols per request

    // Cache to store recently fetched prices (valid for 5 minutes)
    private priceCache: Map<string, { data: TokenPriceData; timestamp: number }> = new Map();
    private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Cache to store token details (valid for 24 hours)
    private tokenDetailsCache: Map<string, { data: TokenDetails; timestamp: number }> = new Map();
    private readonly tokenDetailsCacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

    /**
     * Get network ID from network name
     */
    getNetworkId(networkName: string): number {
        const network = Object.values(BlockchainNetwork).find((n) => n.toLowerCase() === networkName.toLowerCase());

        if (!network) {
            return 0; // Unknown network
        }

        return NETWORK_IDS[network as BlockchainNetwork] || 0;
    }

    /**
     * Get token details by symbol and network name
     */
    async getTokenDetails(symbol: string, networkName: string): Promise<TokenDetails | null> {
        const cacheKey = `${symbol.toUpperCase()}:${networkName.toLowerCase()}`;

        console.log(`Getting token details for ${symbol} on ${networkName}`);

        // Check cache first
        const cachedData = this.tokenDetailsCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < this.tokenDetailsCacheTTL) {
            return cachedData.data;
        }

        try {
            // Find the preferred network info based on the network name
            const preferredNetworkInfo =
                Object.entries(NETWORK_MAPPING).find(
                    ([platformName, _]) => platformName.toLowerCase() === networkName.toLowerCase()
                )?.[1] ||
                Object.entries(NETWORK_MAPPING).find(
                    ([_, info]) => info.network.toLowerCase() === networkName.toLowerCase()
                )?.[1];

            // Make API request to CoinMarketCap v2 API
            const response = await axios.get<CoinMarketCapInfoResponse>(`${this.baseUrl}/cryptocurrency/info`, {
                params: {
                    symbol: symbol.toUpperCase()
                },
                headers: {
                    "X-CMC_PRO_API_KEY": this.apiKey
                }
            });

            if (!response.data || !response.data.data || !response.data.data[symbol.toUpperCase()]) {
                logger.warn(`No token details found for symbol: ${symbol}`);
                return null;
            }

            const tokenData = response.data.data[symbol.toUpperCase()][0];

            // Create a base TokenDetails object
            const tokenDetails: TokenDetails = {
                id: tokenData.id,
                name: tokenData.name,
                symbol: tokenData.symbol,
                slug: tokenData.slug,
                category: tokenData.category || "",
                rank: 0, // Rank is not provided in the v2 API
                is_active: 1, // Assume active if it's returned by the API
                platform: tokenData.platform,
                contract_address: tokenData.contract_address,
                // Include other fields from TokenDetailsV2
                description: tokenData.description,
                logo: tokenData.logo,
                urls: tokenData.urls,
                date_added: tokenData.date_added,
                twitter_username: tokenData.twitter_username
            };

            // Try to find contract address for the specified network
            if (preferredNetworkInfo && tokenData.contract_address && Array.isArray(tokenData.contract_address)) {
                if (preferredNetworkInfo.chainId) {
                    const chainIdStr = preferredNetworkInfo.chainId.toString();
                    const contractAddressInfo = tokenData.contract_address.find(
                        (address) => address.platform.coin.id === chainIdStr
                    );

                    if (contractAddressInfo) {
                        // Found a matching contract address
                        const contractAddress = contractAddressInfo.contract_address;
                        const blockchainNetwork = preferredNetworkInfo.network;

                        // Use crypto service to fetch additional token data
                        try {
                            const cryptoTokenData = await cryptoService().fetchTokenData(
                                contractAddress,
                                blockchainNetwork
                            );

                            // Update token details with data from crypto service
                            tokenDetails.contractAddress = contractAddress;
                            tokenDetails.network = blockchainNetwork;
                            tokenDetails.networkId = cryptoTokenData.networkId;
                            tokenDetails.decimals = cryptoTokenData.decimals;

                            // In case the symbol or name from the blockchain is different, keep both
                            if (cryptoTokenData.symbol !== tokenDetails.symbol) {
                                tokenDetails.onChainSymbol = cryptoTokenData.symbol;
                            }

                            if (cryptoTokenData.name !== tokenDetails.name) {
                                tokenDetails.onChainName = cryptoTokenData.name;
                            }
                        } catch (error) {
                            // If crypto service fails, use default values
                            logger.warn(
                                `Failed to fetch token data from blockchain for ${contractAddress} on ${blockchainNetwork}:`,
                                error
                            );
                            tokenDetails.contractAddress = contractAddress;
                            tokenDetails.network = blockchainNetwork;
                            tokenDetails.networkId = NETWORK_IDS[blockchainNetwork];
                            tokenDetails.decimals = preferredNetworkInfo.decimals;
                        }
                    }
                }
            }

            // If we couldn't find a contract address for the specified network,
            // try the old platform field as fallback
            if (!tokenDetails.contractAddress && tokenData.platform) {
                const platformName = tokenData.platform.name;
                const networkInfo = NETWORK_MAPPING[platformName];

                if (networkInfo) {
                    tokenDetails.contractAddress = tokenData.platform.token_address;
                    tokenDetails.network = networkInfo.network;
                    tokenDetails.networkId = NETWORK_IDS[networkInfo.network];

                    // Try to fetch token data from blockchain
                    try {
                        const cryptoTokenData = await cryptoService().fetchTokenData(
                            tokenData.platform.token_address,
                            networkInfo.network
                        );

                        tokenDetails.decimals = cryptoTokenData.decimals;

                        if (cryptoTokenData.symbol !== tokenDetails.symbol) {
                            tokenDetails.onChainSymbol = cryptoTokenData.symbol;
                        }

                        if (cryptoTokenData.name !== tokenDetails.name) {
                            tokenDetails.onChainName = cryptoTokenData.name;
                        }
                    } catch (error) {
                        // If crypto service fails, use default values
                        logger.warn(
                            `Failed to fetch token data from blockchain for ${tokenData.platform.token_address} on ${networkInfo.network}:`,
                            error
                        );
                        tokenDetails.decimals = networkInfo.decimals;
                    }
                }
            }

            // Cache the result
            this.tokenDetailsCache.set(cacheKey, {
                data: tokenDetails,
                timestamp: Date.now()
            });

            return tokenDetails;
        } catch (error) {
            logger.error(`Failed to fetch token details for ${symbol} on ${networkName}:`, error);
            return null;
        }
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

    // Create LangChain tool for token details
    const tokenDetailsTool = tool(
        async ({ symbol, network }) => {
            try {
                const tokenDetails = await coinMarketCapService.getTokenDetails(symbol.toUpperCase(), network);

                if (!tokenDetails) {
                    return `Sorry, I couldn't find details for ${symbol} on ${network} network.`;
                }

                let response = `*${tokenDetails.name} (${tokenDetails.symbol})*\n`;

                if (tokenDetails.onChainName) {
                    response += `On-chain Name: ${tokenDetails.onChainName}\n`;
                }

                if (tokenDetails.onChainSymbol) {
                    response += `On-chain Symbol: ${tokenDetails.onChainSymbol}\n`;
                }

                if (tokenDetails.description) {
                    // Truncate description if too long
                    const maxDescLength = 150;
                    const desc =
                        tokenDetails.description.length > maxDescLength
                            ? tokenDetails.description.substring(0, maxDescLength) + "..."
                            : tokenDetails.description;
                    response += `Description: ${desc}\n`;
                }

                if (tokenDetails.category) {
                    response += `Category: ${tokenDetails.category}\n`;
                }

                if (tokenDetails.network) {
                    response += `Network: ${tokenDetails.network}\n`;
                }

                if (tokenDetails.contractAddress) {
                    response += `Contract Address: ${tokenDetails.contractAddress}\n`;
                }

                if (tokenDetails.decimals !== undefined) {
                    response += `Decimals: ${tokenDetails.decimals}\n`;
                }

                // Add links if available
                if (tokenDetails.urls) {
                    if (tokenDetails.urls.website && tokenDetails.urls.website.length > 0) {
                        response += `Website: ${tokenDetails.urls.website[0]}\n`;
                    }

                    if (tokenDetails.urls.explorer && tokenDetails.urls.explorer.length > 0) {
                        response += `Explorer: ${tokenDetails.urls.explorer[0]}\n`;
                    }
                }

                return response;
            } catch (error) {
                logger.error(`Error fetching token details for ${symbol} on ${network}:`, error);
                return `Sorry, I couldn't fetch details for ${symbol} on ${network}. The symbol may be invalid or there might be an issue with the API.`;
            }
        },
        {
            name: "get_token_details",
            description: "Get detailed information about a token by symbol and network",
            schema: z.object({
                symbol: z.string().describe("The cryptocurrency symbol (e.g., BTC, ETH, USDT)"),
                network: z.string().describe("The blockchain network name (e.g., ethereum, bsc, polygon)")
            })
        }
    );

    // Register the tools with LangChain service
    langchainService.registerTools([cryptoPriceTool, tokenDetailsTool]);

    return coinMarketCapService;
}

export const coinMarketCapService = new CoinMarketCapService();
