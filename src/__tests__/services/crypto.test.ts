import { cryptoService, CryptoService } from "../../services/crypto";
import axios from "axios";
import { createPublicClient, http, getContract, type PublicClient, type Chain } from "viem";
import { BlockchainNetwork } from "../../services/blockchain-types";

// Mock the Langchain service
jest.mock("../../services/langchain", () => ({
    langchainService: {
        registerTools: jest.fn()
    }
}));

// Mock the OpenAI service
jest.mock("../../services/openai", () => ({
    registerTotalCryptoHoldingsIntent: jest.fn()
}));

// Mock the exchange rate service
jest.mock("../../services/exchangeRate", () => ({
    exchangeRateService: {
        convertCurrency: jest.fn()
    }
}));

// Mock the binance service
jest.mock("../../services/binance", () => ({
    binanceService: {
        getSpotPrice: jest.fn()
    }
}));

// Mock the config/constants module
jest.mock("../../config/constants", () => ({
    env: {
        OPENAI_API_KEY: "test-openai-key",
        ETHERSCAN_API_KEY: "test-etherscan-key",
        BSCSCAN_API_KEY: "test-bscscan-key",
        POLYGONSCAN_API_KEY: "test-polygonscan-key",
        SOLSCAN_API_KEY: "test-solscan-key",
        ARBISCAN_API_KEY: "test-arbiscan-key",
        OPTIMISTIC_ETHERSCAN_API_KEY: "test-optimistic-key",
        SNOWTRACE_API_KEY: "test-snowtrace-key",
        BASESCAN_API_KEY: "test-basescan-key",
        EXCHANGE_RATE_API_KEY: "test-exchange-rate-key",
        EXCHANGE_RATE_API_FREE: true,
        BINANCE_API_KEY: "test-binance-key",
        BINANCE_API_SECRET: "test-binance-secret"
    }
}));

// Mock the logger
jest.mock("../../utils/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock the BlockchainNetwork enum to make sure it's available
jest.mock("../../services/wallet", () => {
    const originalModule = jest.requireActual("../../services/wallet");
    return {
        ...originalModule,
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

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock viem
jest.mock("viem", () => {
    const originalModule = jest.requireActual("viem");

    return {
        ...originalModule,
        createPublicClient: jest.fn(),
        http: jest.fn(),
        getContract: jest.fn()
    };
});

// Mock token data
const mockTokenData = {
    ETHEREUM: {
        "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34": {
            symbol: "SNSY",
            name: "SNSY Token",
            decimals: 18,
            contractAddress: "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34",
            network: BlockchainNetwork.ETHEREUM,
            networkId: 1
        }
    },
    BSC: {
        "0x55d398326f99059fF775485246999027B3197955": {
            symbol: "USDT",
            name: "Tether USD",
            decimals: 6,
            contractAddress: "0x55d398326f99059fF775485246999027B3197955",
            network: BlockchainNetwork.BSC,
            networkId: 56
        }
    }
};

describe("Crypto Service", () => {
    let service: CryptoService;
    let mockClient: jest.Mocked<PublicClient>;
    let mockContract: any;

    beforeEach(() => {
        // Clear all mock calls before each test
        jest.clearAllMocks();

        // Setup mock contract
        mockContract = {
            read: {
                name: jest.fn(),
                symbol: jest.fn(),
                decimals: jest.fn()
            }
        };

        // Setup mock client
        mockClient = {
            // Add necessary mocked methods
        } as unknown as jest.Mocked<PublicClient>;

        // Mock getContract
        (getContract as jest.Mock).mockReturnValue(mockContract);

        // Mock createPublicClient
        (createPublicClient as jest.Mock).mockReturnValue(mockClient);

        // Create a new instance for each test
        service = cryptoService();
    });

    describe("Network Functions", () => {
        describe("getNetworkId", () => {
            it("should return correct network ID for Ethereum", () => {
                const ethereumId = service.getNetworkId(BlockchainNetwork.ETHEREUM);
                expect(ethereumId).toBe(1);
            });

            it("should return correct network ID for BSC", () => {
                const bscId = service.getNetworkId(BlockchainNetwork.BSC);
                expect(bscId).toBe(56);
            });
        });

        describe("getNetworkFromId", () => {
            it("should return correct network for ID 1 (Ethereum)", () => {
                const ethereumNetwork = service.getNetworkFromId(1);
                expect(ethereumNetwork).toBe(BlockchainNetwork.ETHEREUM);
            });

            it("should return correct network for ID 56 (BSC)", () => {
                const bscNetwork = service.getNetworkFromId(56);
                expect(bscNetwork).toBe(BlockchainNetwork.BSC);
            });

            it("should return null for unknown network ID", () => {
                const unknownNetwork = service.getNetworkFromId(9999);
                expect(unknownNetwork).toBeNull();
            });
        });
    });

    describe("Token Data", () => {
        describe("fetchTokenData", () => {
            it("should fetch token data for USDT on BSC", async () => {
                const usdtAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT on BSC

                // Setup specific mocks for this test
                mockContract.read.name.mockResolvedValueOnce("Tether USD");
                mockContract.read.symbol.mockResolvedValueOnce("USDT");
                mockContract.read.decimals.mockResolvedValueOnce(6n);

                const tokenData = await service.fetchTokenData(usdtAddress, BlockchainNetwork.BSC);

                expect(tokenData.symbol).toBe("USDT");
                expect(tokenData.decimals).toBe(6);
                expect(tokenData.networkId).toBe(56);
                expect(tokenData.contractAddress).toBe(usdtAddress);
                expect(tokenData.network).toBe(BlockchainNetwork.BSC);

                // Verify that the contract methods were called
                expect(mockContract.read.name).toHaveBeenCalledTimes(1);
                expect(mockContract.read.symbol).toHaveBeenCalledTimes(1);
                expect(mockContract.read.decimals).toHaveBeenCalledTimes(1);
            });

            it("should fetch token data for SNSY on Ethereum", async () => {
                const snsyAddress = "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34"; // SNSY on Ethereum

                // Setup specific mocks for this test
                mockContract.read.name.mockResolvedValueOnce("SNSY Token");
                mockContract.read.symbol.mockResolvedValueOnce("SNSY");
                mockContract.read.decimals.mockResolvedValueOnce(18n);

                const tokenData = await service.fetchTokenData(snsyAddress, BlockchainNetwork.ETHEREUM);

                expect(tokenData.symbol).toBe("SNSY");
                expect(tokenData.networkId).toBe(1);
                expect(tokenData.contractAddress).toBe(snsyAddress);
                expect(tokenData.network).toBe(BlockchainNetwork.ETHEREUM);

                // Verify that the contract methods were called
                expect(mockContract.read.name).toHaveBeenCalledTimes(1);
                expect(mockContract.read.symbol).toHaveBeenCalledTimes(1);
                expect(mockContract.read.decimals).toHaveBeenCalledTimes(1);
            });

            it("should throw an error for invalid token address", async () => {
                const invalidAddress = "0x0000000000000000000000000000000000000000"; // Invalid/Zero address

                // Mock a failure for this specific test
                mockContract.read.symbol.mockRejectedValueOnce(new Error("Invalid token"));

                // Use a more general assertion that just checks if any error is thrown
                // Since the exact error message is different from what's in the mock
                await expect(service.fetchTokenData(invalidAddress, BlockchainNetwork.ETHEREUM)).rejects.toThrow(
                    `Failed to fetch token data for ${invalidAddress} on ${BlockchainNetwork.ETHEREUM}`
                );
            });

            it("should fetch Solana token data", async () => {
                const solAddress = "So11111111111111111111111111111111111111112"; // SOL token

                // Setup mock for Solana
                mockedAxios.get.mockResolvedValueOnce({
                    data: {
                        symbol: "SOL",
                        name: "Solana",
                        decimals: 9
                    }
                });

                const tokenData = await service.fetchTokenData(solAddress, BlockchainNetwork.SOLANA);

                expect(tokenData.symbol).toBe("SOL");
                expect(tokenData.name).toBe("Solana");
                expect(tokenData.decimals).toBe(9);
                expect(tokenData.contractAddress).toBe(solAddress);
                expect(tokenData.network).toBe(BlockchainNetwork.SOLANA);

                // Verify axios was called with correct parameters
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    expect.stringContaining("/token/meta"),
                    expect.objectContaining({
                        params: { tokenAddress: solAddress }
                    })
                );
            });

            it("should use cache for repeated token data requests", async () => {
                const snsyAddress = "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34"; // SNSY on Ethereum

                // Create a spy on the service.fetchTokenData method to track calls to it
                const serviceSpy = jest.spyOn(service as any, "fetchTokenData");

                // Setup specific mocks for this test
                mockContract.read.name.mockResolvedValue("SNSY Token");
                mockContract.read.symbol.mockResolvedValue("SNSY");
                mockContract.read.decimals.mockResolvedValue(18n);

                // First call
                const result1 = await service.fetchTokenData(snsyAddress, BlockchainNetwork.ETHEREUM);

                // Second call - should use cache
                const result2 = await service.fetchTokenData(snsyAddress, BlockchainNetwork.ETHEREUM);

                // Verify the spy was called twice (even though it should use cache internally)
                expect(serviceSpy).toHaveBeenCalledTimes(2);

                // Verify both calls returned the same object reference (which would be from cache)
                expect(result1).toBe(result2);

                // The cache implementation might be different than we expected, so we check that at least
                // the data is consistent between calls
                expect(result2.symbol).toBe("SNSY");
                expect(result2.network).toBe(BlockchainNetwork.ETHEREUM);

                // Clean up the spy
                serviceSpy.mockRestore();
            });
        });
    });
});
