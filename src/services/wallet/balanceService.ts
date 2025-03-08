import axios from "axios";
import { BigNumber } from "bignumber.js";
import { BlockchainNetwork } from "../blockchain-types";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";
import { TokenBalance, TokenInfo } from "./types";
import { CoinMarketCapService } from "../coinMarketCap";
import { TokenService } from "./tokenService";

export class WalletBalanceService {
    private readonly etherscanApiKey = env.ETHERSCAN_API_KEY;
    private readonly bscscanApiKey = env.BSCSCAN_API_KEY;
    private readonly polygonscanApiKey = env.POLYGONSCAN_API_KEY;
    private readonly solscanApiKey = env.SOLSCAN_API_KEY;
    private readonly arbiscanApiKey = env.ARBISCAN_API_KEY;
    private readonly optimisticEtherscanApiKey = env.OPTIMISTIC_ETHERSCAN_API_KEY;
    private readonly snowtraceApiKey = env.SNOWTRACE_API_KEY;
    private readonly basescanApiKey = env.BASESCAN_API_KEY;
    private readonly coinMarketCapService: CoinMarketCapService;
    private readonly tokenService: TokenService;

    constructor(coinMarketCapService: CoinMarketCapService) {
        this.coinMarketCapService = coinMarketCapService;
        this.tokenService = new TokenService();
    }

    /**
     * Get the API URL for a specific blockchain explorer
     */
    private getApiUrl(network: BlockchainNetwork): string {
        switch (network) {
            case BlockchainNetwork.ETHEREUM:
                return "https://api.etherscan.io/api";
            case BlockchainNetwork.BSC:
                return "https://api.bscscan.com/api";
            case BlockchainNetwork.POLYGON:
                return "https://api.polygonscan.com/api";
            case BlockchainNetwork.ARBITRUM:
                return "https://api.arbiscan.io/api";
            case BlockchainNetwork.OPTIMISM:
                return "https://api-optimistic.etherscan.io/api";
            case BlockchainNetwork.AVALANCHE:
                return "https://api.snowtrace.io/api";
            case BlockchainNetwork.SOLANA:
                return "https://public-api.solscan.io";
            case BlockchainNetwork.BASE:
                return "https://api.basescan.org/api";
            default:
                throw new Error(`Unsupported network: ${network}`);
        }
    }

    /**
     * Get the API key for a specific blockchain explorer
     */
    private getApiKey(network: BlockchainNetwork): string | undefined {
        switch (network) {
            case BlockchainNetwork.ETHEREUM:
                return this.etherscanApiKey;
            case BlockchainNetwork.BSC:
                return this.bscscanApiKey;
            case BlockchainNetwork.POLYGON:
                return this.polygonscanApiKey;
            case BlockchainNetwork.SOLANA:
                return this.solscanApiKey;
            case BlockchainNetwork.ARBITRUM:
                return this.arbiscanApiKey;
            case BlockchainNetwork.OPTIMISM:
                return this.optimisticEtherscanApiKey;
            case BlockchainNetwork.AVALANCHE:
                return this.snowtraceApiKey;
            case BlockchainNetwork.BASE:
                return this.basescanApiKey;
            default:
                return undefined;
        }
    }

    /**
     * Fetch token balances for a wallet
     */
    async fetchTokenBalances(address: string, network: BlockchainNetwork): Promise<TokenBalance[]> {
        try {
            const apiUrl = this.getApiUrl(network);
            const apiKey = this.getApiKey(network);

            if (!apiKey) {
                throw new Error(`API key not configured for network: ${network}`);
            }

            // Handle Solana differently
            if (network === BlockchainNetwork.SOLANA) {
                return this.fetchSolanaTokenBalances(address);
            }

            // For EVM-compatible chains
            const tokenBalances: TokenBalance[] = [];

            // Get tokens for this network from the database
            const networksTokens = await this.tokenService.getTokensByNetwork(network);

            // Fetch balance for each token
            for (const token of networksTokens) {
                try {
                    const response = await axios.get(apiUrl, {
                        params: {
                            module: "account",
                            action: "tokenbalance",
                            address,
                            contractaddress: token.contractAddress,
                            tag: "latest",
                            apikey: apiKey
                        }
                    });

                    if (response.data.status === "1") {
                        const rawBalance = response.data.result;
                        const balance = new BigNumber(rawBalance).dividedBy(new BigNumber(10).pow(token.decimals));

                        if (balance.isGreaterThan(0)) {
                            tokenBalances.push({
                                symbol: token.symbol,
                                name: token.name,
                                balance,
                                decimals: token.decimals,
                                contractAddress: token.contractAddress
                            });
                        }
                    }
                } catch (error) {
                    logger.error(`Error fetching balance for token ${token.symbol}:`, error);
                }
            }

            // Also fetch native token balance (ETH, BNB, MATIC, etc.)
            const nativeBalance = await this.fetchNativeTokenBalance(address, network);
            if (nativeBalance) {
                tokenBalances.push(nativeBalance);
            }

            return tokenBalances;
        } catch (error) {
            logger.error(`Error fetching token balances for ${address} on ${network}:`, error);
            return [];
        }
    }

    /**
     * Fetch native token balance (ETH, BNB, MATIC, etc.)
     */
    private async fetchNativeTokenBalance(address: string, network: BlockchainNetwork): Promise<TokenBalance | null> {
        try {
            const apiUrl = this.getApiUrl(network);
            const apiKey = this.getApiKey(network);

            const response = await axios.get(apiUrl, {
                params: {
                    module: "account",
                    action: "balance",
                    address,
                    tag: "latest",
                    apikey: apiKey
                }
            });

            if (response.data.status !== "1") {
                return null;
            }

            const balance = new BigNumber(response.data.result).dividedBy(new BigNumber(10).pow(18)); // Convert from wei to ether

            if (balance.isLessThanOrEqualTo(0)) {
                return null;
            }

            // Map network to native token symbol
            const nativeTokenMap: Record<BlockchainNetwork, { symbol: string; name: string }> = {
                [BlockchainNetwork.ETHEREUM]: { symbol: "ETH", name: "Ethereum" },
                [BlockchainNetwork.BSC]: { symbol: "BNB", name: "Binance Coin" },
                [BlockchainNetwork.POLYGON]: { symbol: "MATIC", name: "Polygon" },
                [BlockchainNetwork.SOLANA]: { symbol: "SOL", name: "Solana" },
                [BlockchainNetwork.ARBITRUM]: { symbol: "ETH", name: "Ethereum" },
                [BlockchainNetwork.OPTIMISM]: { symbol: "ETH", name: "Ethereum" },
                [BlockchainNetwork.AVALANCHE]: { symbol: "AVAX", name: "Avalanche" },
                [BlockchainNetwork.BASE]: { symbol: "ETH", name: "Ethereum" }
            };

            const { symbol, name } = nativeTokenMap[network];

            return {
                symbol,
                name,
                balance,
                decimals: 18
            };
        } catch (error) {
            logger.error(`Failed to fetch native token balance for ${address} on ${network}:`, error);
            return null;
        }
    }

    /**
     * Fetch Solana token balances (different API structure)
     */
    private async fetchSolanaTokenBalances(address: string): Promise<TokenBalance[]> {
        try {
            const apiUrl = "https://public-api.solscan.io/account/tokens";
            const apiKey = this.solscanApiKey;

            const response = await axios.get(`${apiUrl}?account=${address}`, {
                headers: apiKey ? { token: apiKey } : {}
            });

            const tokenBalances: TokenBalance[] = [];

            for (const token of response.data) {
                const balance = new BigNumber(token.tokenAmount.amount).dividedBy(
                    new BigNumber(10).pow(token.tokenAmount.decimals)
                );

                if (balance.isGreaterThan(0)) {
                    tokenBalances.push({
                        symbol: token.tokenSymbol || "Unknown",
                        name: token.tokenName || "Unknown Token",
                        balance,
                        decimals: token.tokenAmount.decimals
                    });
                }
            }

            // Also fetch SOL balance
            const solBalance = await this.fetchSolanaNativeBalance(address);
            if (solBalance) {
                tokenBalances.push(solBalance);
            }

            return tokenBalances;
        } catch (error) {
            logger.error(`Failed to fetch Solana token balances for ${address}:`, error);
            throw new Error(`Failed to fetch Solana token balances for ${address}`);
        }
    }

    /**
     * Fetch native SOL balance
     */
    private async fetchSolanaNativeBalance(address: string): Promise<TokenBalance | null> {
        try {
            const apiUrl = "https://public-api.solscan.io/account/solBalance";
            const apiKey = this.solscanApiKey;

            const response = await axios.get(`${apiUrl}?account=${address}`, {
                headers: apiKey ? { token: apiKey } : {}
            });

            const balance = new BigNumber(response.data.lamports).dividedBy(new BigNumber(10).pow(9)); // Convert from lamports to SOL

            if (balance.isLessThanOrEqualTo(0)) {
                return null;
            }

            return {
                symbol: "SOL",
                name: "Solana",
                balance,
                decimals: 9
            };
        } catch (error) {
            logger.error(`Failed to fetch SOL balance for ${address}:`, error);
            return null;
        }
    }

    /**
     * Calculate USD value for token balances
     */
    async calculateUsdValues(tokenBalances: TokenBalance[]): Promise<TokenBalance[]> {
        if (tokenBalances.length === 0) {
            return [];
        }

        const result = [...tokenBalances];

        try {
            // Extract all unique symbols for batch request
            const symbols = [...new Set(result.map((token) => token.symbol))];

            // Fetch all prices in a single API call
            const tokenPrices = await this.coinMarketCapService.getMultipleTokenPrices(symbols);

            // Update token balances with price data
            for (const token of result) {
                try {
                    const priceData = tokenPrices[token.symbol.toUpperCase()];

                    if (priceData) {
                        token.tokenPrice = priceData.price;
                        token.valueUsd = token.balance.multipliedBy(priceData.price).toNumber();
                    } else {
                        logger.warn(`No price data found for ${token.symbol}`);
                    }
                } catch (error) {
                    logger.warn(`Failed to process price for ${token.symbol}:`, error);
                    // Keep token in the list but with undefined price/value
                }
            }
        } catch (error) {
            logger.error("Failed to fetch batch prices for tokens:", error);
            // Continue with tokens having undefined prices/values
        }

        return result;
    }
}
