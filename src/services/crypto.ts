import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { BlockchainNetwork } from "./wallet";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { langchainService } from "./langchain";
import { createPublicClient, http, getContract, type PublicClient, type Chain, erc20Abi } from "viem";
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, base } from "viem/chains";
import axios from "axios";

// Network ID mapping
export const NETWORK_IDS: Record<BlockchainNetwork, number> = {
    [BlockchainNetwork.ETHEREUM]: 1,
    [BlockchainNetwork.BSC]: 56,
    [BlockchainNetwork.POLYGON]: 137,
    [BlockchainNetwork.SOLANA]: 0, // Solana doesn't use EVM-compatible IDs
    [BlockchainNetwork.ARBITRUM]: 42161,
    [BlockchainNetwork.OPTIMISM]: 10,
    [BlockchainNetwork.AVALANCHE]: 43114,
    [BlockchainNetwork.BASE]: 8453
};

// Token data interface
export interface TokenData {
    symbol: string;
    name: string;
    decimals: number;
    contractAddress: string;
    network: BlockchainNetwork;
    networkId: number;
}

export class CryptoService {
    // Chain configurations for viem
    private readonly chains: Record<BlockchainNetwork, Chain> = {
        [BlockchainNetwork.ETHEREUM]: mainnet,
        [BlockchainNetwork.BSC]: bsc,
        [BlockchainNetwork.POLYGON]: polygon,
        [BlockchainNetwork.SOLANA]: {} as Chain, // Not applicable for Solana
        [BlockchainNetwork.ARBITRUM]: arbitrum,
        [BlockchainNetwork.OPTIMISM]: optimism,
        [BlockchainNetwork.AVALANCHE]: avalanche,
        [BlockchainNetwork.BASE]: base
    };

    // For Solana API
    private readonly solscanApiKey = env.SOLSCAN_API_KEY;
    private readonly solscanApiUrl = "https://public-api.solscan.io";

    // Cache to store token data to reduce API calls
    private tokenDataCache: Map<string, TokenData> = new Map();
    private readonly cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Store viem clients for each network
    private clients: Map<BlockchainNetwork, PublicClient> = new Map();

    constructor() {
        // Initialize viem clients for EVM chains
        Object.values(BlockchainNetwork).forEach((network) => {
            if (network !== BlockchainNetwork.SOLANA) {
                this.initClient(network);
            }
        });
    }

    /**
     * Initialize a viem client for a specific network
     */
    private initClient(network: BlockchainNetwork): void {
        if (network === BlockchainNetwork.SOLANA) return;

        try {
            const chain = this.chains[network];

            const client = createPublicClient({
                chain,
                transport: http()
            });

            this.clients.set(network, client);
        } catch (error) {
            logger.error(`Failed to initialize viem client for ${network}:`, error);
        }
    }

    /**
     * Get a viem client for a specific network
     */
    private getClient(network: BlockchainNetwork): PublicClient {
        if (network === BlockchainNetwork.SOLANA) {
            throw new Error("Viem client not available for Solana");
        }

        const client = this.clients.get(network);
        if (!client) {
            this.initClient(network);
            const newClient = this.clients.get(network);
            if (!newClient) {
                throw new Error(`Failed to initialize viem client for ${network}`);
            }
            return newClient;
        }

        return client;
    }

    /**
     * Get network ID from network name
     */
    getNetworkId(network: BlockchainNetwork): number {
        return NETWORK_IDS[network] || 0;
    }

    /**
     * Get network name from network ID
     */
    getNetworkFromId(networkId: number): BlockchainNetwork | null {
        for (const [network, id] of Object.entries(NETWORK_IDS)) {
            if (id === networkId) {
                return network as BlockchainNetwork;
            }
        }
        return null;
    }

    /**
     * Fetch token data using viem for EVM chains or Solscan for Solana
     */
    async fetchTokenData(contractAddress: string, network: BlockchainNetwork): Promise<TokenData> {
        // Generate a cache key
        const cacheKey = `${network}:${contractAddress.toLowerCase()}`;

        // Check cache first
        const cachedData = this.tokenDataCache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        // Handle Solana differently as it's not EVM-compatible
        if (network === BlockchainNetwork.SOLANA) {
            return this.fetchSolanaTokenData(contractAddress);
        }

        try {
            const client = this.getClient(network);

            // Create a contract instance
            const contract = getContract({
                address: contractAddress as `0x${string}`,
                abi: erc20Abi,
                client
            });

            // Fetch token data using viem
            const [name, symbol, decimals] = await Promise.all([
                contract.read.name(),
                contract.read.symbol(),
                contract.read.decimals()
            ]);

            const tokenData: TokenData = {
                symbol: symbol,
                name: name,
                decimals: Number(decimals),
                contractAddress: contractAddress,
                network: network,
                networkId: this.getNetworkId(network)
            };

            // Cache the result
            this.tokenDataCache.set(cacheKey, tokenData);

            return tokenData;
        } catch (error) {
            logger.error(`Failed to fetch token data for ${contractAddress} on ${network}:`, error);
            throw new Error(`Failed to fetch token data for ${contractAddress} on ${network}`);
        }
    }

    /**
     * Fetch Solana token data
     */
    private async fetchSolanaTokenData(mintAddress: string): Promise<TokenData> {
        try {
            const headers: Record<string, string> = {};
            if (this.solscanApiKey) {
                headers["token"] = this.solscanApiKey;
            }

            const response = await axios.get(`${this.solscanApiUrl}/token/meta`, {
                params: { tokenAddress: mintAddress },
                headers
            });

            if (!response.data || !response.data.symbol) {
                throw new Error(`Token data not found for Solana mint address ${mintAddress}`);
            }

            const tokenData: TokenData = {
                symbol: response.data.symbol,
                name: response.data.name || response.data.symbol,
                decimals: response.data.decimals || 0,
                contractAddress: mintAddress,
                network: BlockchainNetwork.SOLANA,
                networkId: 0 // Solana doesn't use EVM-compatible IDs
            };

            // Cache the result
            const cacheKey = `${BlockchainNetwork.SOLANA}:${mintAddress.toLowerCase()}`;
            this.tokenDataCache.set(cacheKey, tokenData);

            return tokenData;
        } catch (error) {
            logger.error(`Failed to fetch Solana token data for ${mintAddress}:`, error);
            throw new Error(`Failed to fetch Solana token data for ${mintAddress}`);
        }
    }
}

// Singleton instance
const cryptoServiceInstance = new CryptoService();

export function initCryptoService() {
    // Create LangChain tool for token data
    const tokenDataTool = tool(
        async ({ contractAddress, network }) => {
            try {
                const tokenData = await cryptoServiceInstance.fetchTokenData(
                    contractAddress,
                    network as BlockchainNetwork
                );

                return JSON.stringify(
                    {
                        symbol: tokenData.symbol,
                        name: tokenData.name,
                        decimals: tokenData.decimals,
                        contractAddress: tokenData.contractAddress,
                        network: tokenData.network,
                        networkId: tokenData.networkId
                    },
                    null,
                    2
                );
            } catch (error) {
                logger.error(`Error fetching token data:`, error);
                return `Sorry, I couldn't fetch the token data. ${error instanceof Error ? error.message : "Unknown error"}`;
            }
        },
        {
            name: "get_token_data",
            description: "Get token data (symbol, name, decimals) from a contract address on a specific blockchain",
            schema: z.object({
                contractAddress: z.string().describe("The token contract address"),
                network: z
                    .enum(Object.values(BlockchainNetwork) as [string, ...string[]])
                    .describe("The blockchain network")
            })
        }
    );

    // Register the tool with LangChain service
    langchainService.registerTools([tokenDataTool]);

    return cryptoServiceInstance;
}

export const cryptoService = (): CryptoService => {
    return cryptoServiceInstance;
};
