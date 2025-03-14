/**
 * Jest Tests for CoinMarketCap Service
 *
 * This test suite verifies the functionality of the CoinMarketCap service,
 * which is responsible for fetching cryptocurrency price data and token details
 * from the CoinMarketCap API.
 *
 * Tests cover:
 * - Fetching token prices
 * - Fetching token details
 * - Formatting price messages
 * - Cache behavior
 *
 * Note: API calls are mocked to avoid actual network requests.
 */

import axios from "axios";
import { coinMarketCapService, initCoinMarketCapService } from "../../services/coinMarketCap";
import { logger } from "../../utils/logger";
import { BlockchainNetwork } from "../../services/blockchain-types";

// Mock dependencies
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the logger
jest.mock("../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Mock OpenAI service
jest.mock("../../services/openai", () => ({
    openAIService: {
        createCompletion: jest.fn(),
        createCompletion2: jest.fn(),
        createChatCompletion: jest.fn()
    }
}));

// Mock BlockchainNetwork (to avoid circular dependencies)
jest.mock("../../services/wallet", () => {
    const originalModule = jest.requireActual("../../services/wallet");
    return {
        ...originalModule,
        // Assuming BlockchainNetwork is an enum
        BlockchainNetwork: {
            ETHEREUM: "ethereum",
            BSC: "bsc",
            POLYGON: "polygon",
            SOLANA: "solana",
            ARBITRUM: "arbitrum",
            OPTIMISM: "optimism",
            AVALANCHE: "avalanche",
            BASE: "base"
        }
    };
});

// Mock langchain service
jest.mock("../../services/langchain", () => ({
    langchainService: {
        registerTools: jest.fn(),
        parseIntent: jest.fn(),
        handleIntent: jest.fn(),
        generateResponse: jest.fn(),
        generateConversationalResponse: jest.fn()
    }
}));

// Mock environment variable
jest.mock("../../config/constants", () => ({
    env: {
        COIN_MARKET_CAP_API_KEY: "test-api-key",
        OPENAI_API_KEY: "test-openai-key"
    }
}));

// Mock crypto service
jest.mock("../../services/crypto", () => ({
    cryptoService: {
        getToken: jest.fn()
    },
    NETWORK_IDS: {
        ETHEREUM: 1,
        BSC: 56,
        POLYGON: 137,
        ARBITRUM: 42161,
        OPTIMISM: 10,
        AVALANCHE: 43114,
        BASE: 8453
    }
}));

describe("CoinMarketCap Service", () => {
    beforeAll(() => {
        // Initialize the service
        initCoinMarketCapService();
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe("getTokenPrice", () => {
        it("should fetch BTC price successfully", async () => {
            // Mock the API response
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    data: {
                        BTC: [
                            {
                                quote: {
                                    USD: {
                                        price: 50000,
                                        percent_change_24h: 2.5
                                    }
                                }
                            }
                        ]
                    }
                }
            });

            const btcPrice = await coinMarketCapService.getTokenPrice("BTC");

            // Assert the price data
            expect(btcPrice).toBeTruthy();
            expect(btcPrice.price).toBe(50000);
            expect(btcPrice.change24h).toBe(2.5);

            // Check that axios was called correctly
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
                expect.objectContaining({
                    params: { symbol: "BTC" },
                    headers: { "X-CMC_PRO_API_KEY": "test-api-key" }
                })
            );
        });

        it("should handle error when fetching token price", async () => {
            // Mock API error
            mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

            // We expect it to throw an error
            await expect(coinMarketCapService.getTokenPrice("INVALID_TOKEN")).rejects.toThrow();

            // Check logger was called
            expect(mockedAxios.get).toHaveBeenCalled();
        });
    });

    describe("getTokenDetails", () => {
        // Test data for token details tests
        const testCases = [
            { symbol: "USDC", network: "ethereum" },
            { symbol: "USDT", network: "ethereum" },
            { symbol: "CAKE", network: "bsc" },
            { symbol: "MATIC", network: "polygon" },
            { symbol: "ARB", network: "arbitrum" },
            { symbol: "OP", network: "optimism" },
            { symbol: "AVAX", network: "avalanche" },
            { symbol: "SNSY", network: "ethereum" }
        ];

        it.each(testCases)("should fetch token details for $symbol on $network", async ({ symbol, network }) => {
            // Mock response for metadata V2 API
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: {
                        error_code: 0,
                        error_message: null
                    },
                    data: {
                        [symbol.toUpperCase()]: [
                            {
                                id: 1234,
                                name: `${symbol} Token`,
                                symbol: symbol.toUpperCase(),
                                category: "Token",
                                description: `This is a test description for ${symbol}`,
                                slug: symbol.toLowerCase(),
                                urls: {
                                    website: ["https://example.com"],
                                    explorer: [`https://${network}.com/token/0x123`]
                                },
                                platform: {
                                    id: 1,
                                    name:
                                        network === "ethereum"
                                            ? "Ethereum"
                                            : network === "bsc"
                                              ? "BNB Smart Chain (BEP20)"
                                              : network === "polygon"
                                                ? "Polygon"
                                                : network === "arbitrum"
                                                  ? "Arbitrum"
                                                  : network === "optimism"
                                                    ? "Optimism"
                                                    : network === "avalanche"
                                                      ? "Avalanche C-Chain"
                                                      : "Unknown",
                                    symbol: network.toUpperCase(),
                                    slug: network,
                                    token_address: "0x123456789abcdef"
                                },
                                contract_address: [
                                    {
                                        contract_address: "0x123456789abcdef",
                                        platform: {
                                            name:
                                                network === "ethereum"
                                                    ? "Ethereum"
                                                    : network === "bsc"
                                                      ? "BNB Smart Chain (BEP20)"
                                                      : network === "polygon"
                                                        ? "Polygon"
                                                        : network === "arbitrum"
                                                          ? "Arbitrum"
                                                          : network === "optimism"
                                                            ? "Optimism"
                                                            : network === "avalanche"
                                                              ? "Avalanche C-Chain"
                                                              : "Unknown",
                                            coin: {
                                                id: "1",
                                                name: network.toUpperCase(),
                                                symbol: network.toUpperCase(),
                                                slug: network
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            });

            // Get token details
            const tokenDetails = await coinMarketCapService.getTokenDetails(symbol, network);

            // Assert the result
            expect(tokenDetails).toBeTruthy();
            expect(tokenDetails?.name).toBe(`${symbol} Token`);
            expect(tokenDetails?.symbol).toBe(symbol.toUpperCase());
            expect(tokenDetails?.description).toBe(`This is a test description for ${symbol}`);

            // Network-specific validation
            expect(tokenDetails?.network).toBe(network as BlockchainNetwork);
            expect(tokenDetails?.contractAddress).toBe("0x123456789abcdef");

            // Check URLs if available
            if (tokenDetails?.urls) {
                expect(tokenDetails.urls.website).toContain("https://example.com");
                expect(tokenDetails.urls.explorer).toContain(`https://${network}.com/token/0x123`);
            }

            // Verify the API was called correctly
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/info",
                expect.objectContaining({
                    params: {
                        symbol: symbol.toUpperCase()
                    },
                    headers: { "X-CMC_PRO_API_KEY": "test-api-key" }
                })
            );
        });

        it("should handle missing token details gracefully", async () => {
            // Mock empty response
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    status: {
                        error_code: 0,
                        error_message: null
                    },
                    data: {}
                }
            });

            const result = await coinMarketCapService.getTokenDetails("NONEXISTENT", "ethereum");

            // Should return null for non-existent token
            expect(result).toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it("should handle API errors when fetching token details", async () => {
            // Mock API error
            mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

            // We expect it to return null and log the error
            const result = await coinMarketCapService.getTokenDetails("ERROR_TOKEN", "ethereum");
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("formatPriceMessage", () => {
        it("should format price message correctly with positive change", () => {
            const message = coinMarketCapService.formatPriceMessage("BTC", 50000, 2.5);

            expect(message).toContain("BTC");
            expect(message).toContain("$50,000");
            expect(message).toContain("+2.50%");
            expect(message).toContain("🟢");
        });

        it("should format price message correctly with negative change", () => {
            const message = coinMarketCapService.formatPriceMessage("ETH", 2500, -1.5);

            expect(message).toContain("ETH");
            expect(message).toContain("$2,500");
            expect(message).toContain("-1.50%");
            expect(message).toContain("🔴");
        });

        it("should format price message correctly without change", () => {
            const message = coinMarketCapService.formatPriceMessage("XRP", 0.5, null);

            expect(message).toContain("XRP");
            expect(message).toContain("$0.5");
            expect(message).not.toContain("%");
            expect(message).not.toContain("🟢");
            expect(message).not.toContain("🔴");
        });
    });

    describe("Cache behavior", () => {
        it("should use cached token price data when available", async () => {
            // Mock the implementation of getTokenPrice to initialize the cache
            const mockPrice = {
                price: 50000,
                change24h: 2.5
            };

            // Directly set a value in the cache (accessing private property via any)
            (coinMarketCapService as any).priceCache.set("BTC", {
                data: mockPrice,
                timestamp: Date.now()
            });

            // Should retrieve from cache without calling the API
            const cachedResult = await coinMarketCapService.getTokenPrice("BTC");

            // Check that result is correct
            expect(cachedResult).toBeTruthy();
            expect(cachedResult.price).toBe(50000);

            // API should not have been called
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });
    });
});
