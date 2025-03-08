import axios from "axios";
import BigNumber from "bignumber.js";
import { logger } from "../utils/logger";
import { registerTotalCryptoHoldingsIntent } from "./openai";
import { coinMarketCapService, CoinMarketCapService } from "./coinMarketCap";
import { env } from "../config/constants";
import { binanceService } from "./binance";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Supported blockchain networks
export enum BlockchainNetwork {
    ETHEREUM = "ethereum",
    BSC = "bsc",
    POLYGON = "polygon",
    SOLANA = "solana",
    ARBITRUM = "arbitrum",
    OPTIMISM = "optimism",
    AVALANCHE = "avalanche",
    BASE = "base"
}

// Token balance interface
interface TokenBalance {
    symbol: string;
    name: string;
    balance: BigNumber;
    decimals: number;
    contractAddress?: string;
    tokenPrice?: number;
    valueUsd?: number;
}

// Token info interface for tracking specific tokens
interface TokenInfo {
    contractAddress: string;
    network: BlockchainNetwork;
    symbol: string;
    name: string;
    decimals: number;
}

// Wallet data interface
interface WalletData {
    address: string;
    network: BlockchainNetwork;
    label?: string;
}

export class WalletService {
    private wallets: WalletData[] = [];
    private readonly coinMarketCapService: CoinMarketCapService;
    // List of tokens to track across networks
    private readonly tokenList: TokenInfo[] = [
        {
            contractAddress: "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34",
            network: BlockchainNetwork.ETHEREUM,
            symbol: "SNSY",
            name: "Sensay",
            decimals: 18
        },
        {
            contractAddress: "0x55d398326f99059fF775485246999027B3197955",
            network: BlockchainNetwork.BSC,
            symbol: "USDT",
            name: "Tether",
            decimals: 18
        },
        {
            contractAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
            network: BlockchainNetwork.BASE,
            symbol: "USDT",
            name: "Tether",
            decimals: 6
        },
        {
            contractAddress: "0x50CE4129Ca261CCDe4EB100c170843c2936Bc11b",
            network: BlockchainNetwork.BASE,
            symbol: "KOLZ",
            name: "Kolz",
            decimals: 18
        }
    ];

    // Hardcoded list of wallets to track
    private readonly walletsList: WalletData[] = [
        {
            address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
            network: BlockchainNetwork.BSC,
            label: "trezor"
        },
        {
            address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
            network: BlockchainNetwork.BASE,
            label: "trezor"
        },
        {
            address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
            network: BlockchainNetwork.ETHEREUM,
            label: "work"
        },
        {
            address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
            network: BlockchainNetwork.BSC,
            label: "work"
        },
        {
            address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
            network: BlockchainNetwork.POLYGON,
            label: "work"
        }
    ];

    // API keys for blockchain explorers
    private readonly etherscanApiKey = env.ETHERSCAN_API_KEY;
    private readonly bscscanApiKey = env.BSCSCAN_API_KEY;
    private readonly polygonscanApiKey = env.POLYGONSCAN_API_KEY;
    private readonly solscanApiKey = env.SOLSCAN_API_KEY;
    private readonly arbiscanApiKey = env.ARBISCAN_API_KEY;
    private readonly optimisticEtherscanApiKey = env.OPTIMISTIC_ETHERSCAN_API_KEY;
    private readonly snowtraceApiKey = env.SNOWTRACE_API_KEY;
    private readonly basescanApiKey = env.BASESCAN_API_KEY;

    constructor() {
        this.coinMarketCapService = coinMarketCapService();

        // Load wallets from environment variables if available
        this.loadWalletsFromEnv();

        // Load wallets from hardcoded list
        this.loadWalletsFromList();
    }

    /**
     * Load wallet addresses from environment variables
     */
    private loadWalletsFromEnv() {
        const walletEnvVars = Object.keys(process.env)
            .filter((key) => key.startsWith("WALLET_"))
            .map((key) => ({ key, value: process.env[key] }));

        for (const { key, value } of walletEnvVars) {
            if (!value) continue;

            // Format: WALLET_NETWORK_LABEL=address
            const parts = key.split("_");
            if (parts.length < 3) continue;

            const network = parts[1].toLowerCase() as BlockchainNetwork;
            const label = parts.slice(2).join("_").toLowerCase();

            this.addWallet(value, network, label);
        }
    }

    /**
     * Load wallet addresses from hardcoded walletsList
     */
    private loadWalletsFromList() {
        for (const wallet of this.walletsList) {
            this.addWallet(wallet.address, wallet.network, wallet.label);
        }
    }

    /**
     * Add a wallet address to track
     */
    addWallet(address: string, network: BlockchainNetwork, label?: string): void {
        // Check if wallet already exists
        const existingWallet = this.wallets.find(
            (wallet) => wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === network
        );

        if (existingWallet) {
            // Update label if provided
            if (label) {
                existingWallet.label = label;
            }
            return;
        }

        this.wallets.push({ address, network, label });
    }

    /**
     * Remove a wallet address
     */
    removeWallet(address: string, network: BlockchainNetwork): boolean {
        const initialLength = this.wallets.length;
        this.wallets = this.wallets.filter(
            (wallet) => !(wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === network)
        );
        return this.wallets.length < initialLength;
    }

    /**
     * Get all tracked wallets
     */
    getWallets(): WalletData[] {
        return [...this.wallets];
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

            // Get tokens for this network
            const networksTokens = this.tokenList.filter((token) => token.network === network);

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
                    logger.warn(`Failed to fetch balance for token ${token.symbol} (${token.contractAddress}):`, error);
                    // Continue with other tokens
                }
            }

            // Also fetch native token balance (ETH, BNB, MATIC, etc.)
            const nativeBalance = await this.fetchNativeTokenBalance(address, network);
            if (nativeBalance) {
                tokenBalances.push(nativeBalance);
            }

            return tokenBalances;
        } catch (error) {
            logger.error(`Failed to fetch token balances for ${address} on ${network}:`, error, JSON.stringify(error));
            throw new Error(`Failed to fetch token balances for ${address} on ${network}`);
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

    /**
     * Get total wallet value in USD
     */
    async getWalletValueUsd(
        address: string,
        network: BlockchainNetwork
    ): Promise<{
        totalValueUsd: number;
        tokenBalances: TokenBalance[];
    }> {
        const tokenBalances = await this.fetchTokenBalances(address, network);
        const tokenBalancesWithUsd = await this.calculateUsdValues(tokenBalances);

        const totalValueUsd = tokenBalancesWithUsd.reduce((sum, token) => {
            return sum + (token.valueUsd || 0);
        }, 0);

        return {
            totalValueUsd,
            tokenBalances: tokenBalancesWithUsd
        };
    }

    /**
     * Get total value of all wallets in USD
     */
    async getAllWalletsValueUsd(): Promise<{
        totalValueUsd: number;
        wallets: Array<{
            address: string;
            network: BlockchainNetwork;
            label?: string;
            valueUsd: number;
            tokenBalances: TokenBalance[];
        }>;
    }> {
        const walletsWithValues = [];
        let totalValueUsd = 0;

        for (const wallet of this.wallets) {
            try {
                const { totalValueUsd: walletValueUsd, tokenBalances } = await this.getWalletValueUsd(
                    wallet.address,
                    wallet.network
                );

                walletsWithValues.push({
                    ...wallet,
                    valueUsd: walletValueUsd,
                    tokenBalances
                });

                totalValueUsd += walletValueUsd;
            } catch (error) {
                logger.error(`Failed to get value for wallet ${wallet.address} on ${wallet.network}:`, error);
                walletsWithValues.push({
                    ...wallet,
                    valueUsd: 0,
                    tokenBalances: []
                });
            }
        }

        return {
            totalValueUsd,
            wallets: walletsWithValues
        };
    }

    /**
     * Format wallet holdings report
     */
    formatWalletReport(walletData: {
        totalValueUsd: number;
        wallets: Array<{
            address: string;
            network: BlockchainNetwork;
            label?: string;
            valueUsd: number;
            tokenBalances: TokenBalance[];
        }>;
    }): string {
        const formatCurrency = (value: number) =>
            value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Minimum USD value to show in reports
        const minUsdValueToShow = 10;

        let report = `💰 *Wallet Holdings Report* 💰\n\n`;
        report += `*Total Value*: $${formatCurrency(walletData.totalValueUsd)}\n\n`;

        for (const wallet of walletData.wallets) {
            const walletLabel = wallet.label ? `${wallet.label} (${wallet.network})` : `${wallet.network}`;
            const shortAddress = `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`;

            report += `*${walletLabel}* - ${shortAddress}\n`;
            report += `*Value*: $${formatCurrency(wallet.valueUsd)}\n`;

            // Sort tokens by USD value (highest first) and filter out low-value tokens
            const sortedTokens = [...wallet.tokenBalances]
                .filter((token) => (token.valueUsd || 0) >= minUsdValueToShow)
                .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

            if (sortedTokens.length > 0) {
                report += `*Top Holdings*:\n`;

                // Show top 5 tokens by value
                for (let i = 0; i < Math.min(5, sortedTokens.length); i++) {
                    const token = sortedTokens[i];
                    const valueStr = token.valueUsd ? `$${formatCurrency(token.valueUsd)}` : "Unknown value";

                    report += `  • ${token.balance.toFormat(4)} _${token.symbol}_ (${valueStr})\n`;
                }

                // If there are more tokens, show a summary
                if (sortedTokens.length > 5) {
                    const remainingValue = sortedTokens.slice(5).reduce((sum, token) => sum + (token.valueUsd || 0), 0);
                    report += `  • Plus ${sortedTokens.length - 5} more tokens ($${formatCurrency(remainingValue)})\n`;
                }

                // If there are low-value tokens that were filtered out, mention them
                const lowValueTokens = wallet.tokenBalances.filter(
                    (token) => (token.valueUsd || 0) < minUsdValueToShow && (token.valueUsd || 0) > 0
                );
                if (lowValueTokens.length > 0) {
                    const lowValueTotal = lowValueTokens.reduce((sum, token) => sum + (token.valueUsd || 0), 0);
                    report += `  • ${lowValueTokens.length} low-value tokens not shown ($${formatCurrency(lowValueTotal)})\n`;
                }
            } else {
                // Check if there are any tokens at all
                const anyTokens = wallet.tokenBalances.some((token) => (token.valueUsd || 0) > 0);
                if (anyTokens) {
                    report += `Only low-value tokens (< $${minUsdValueToShow}) found.\n`;
                } else {
                    report += `No token balances found.\n`;
                }
            }

            report += `\n`;
        }

        report += `_Generated at: ${new Date().toLocaleString()}_`;
        return report;
    }
}

// Add a new method to get combined holdings (wallets + Binance)
async function getTotalCryptoHoldings(
    walletService: WalletService
): Promise<{ totalUsd: number; formattedReport: string }> {
    try {
        // Minimum USD value to show in reports
        const minUsdValueToShow = 10;

        // Get wallet holdings
        const walletData = await walletService.getAllWalletsValueUsd();
        const walletTotalUsd = walletData.totalValueUsd;

        // Get Binance holdings
        let binanceTotalUsd = 0;
        try {
            const binanceInstance = binanceService();
            binanceTotalUsd = await binanceInstance.getTotalBalanceUsd();
        } catch (error) {
            logger.warn("Could not fetch Binance balance:", error);
            // Continue without Binance data
        }

        // Calculate total
        const totalUsd = walletTotalUsd + binanceTotalUsd;

        // Format report
        let report = `*Total Crypto Holdings*\n\n`;
        report += `*Total Value:* $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

        // Add wallet breakdown
        report += `*Wallet Holdings:* $${walletTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

        // Filter wallets to only show those with significant value
        const significantWallets = walletData.wallets.filter((wallet) => wallet.valueUsd >= minUsdValueToShow);
        const lowValueWallets = walletData.wallets.filter(
            (wallet) => wallet.valueUsd > 0 && wallet.valueUsd < minUsdValueToShow
        );

        // Show significant wallets
        for (const wallet of significantWallets) {
            report += `• ${wallet.label || wallet.address.substring(0, 8)}... (${wallet.network}): $${wallet.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }

        // Mention low-value wallets if any
        if (lowValueWallets.length > 0) {
            const lowValueTotal = lowValueWallets.reduce((sum, wallet) => sum + wallet.valueUsd, 0);
            report += `• ${lowValueWallets.length} low-value wallets not shown: $${lowValueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        }

        // Add Binance breakdown
        report += `\n*Binance Holdings:* $${binanceTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

        return { totalUsd, formattedReport: report };
    } catch (error) {
        logger.error("Failed to get total crypto holdings:", error);
        throw new Error("Failed to get total crypto holdings");
    }
}

export function initWalletService(): WalletService {
    const walletService = new WalletService();
    // Create a LangChain tool for wallet balance
    const walletBalanceTool = tool(
        async () => {
            const walletData = await walletService.getAllWalletsValueUsd();
            return walletService.formatWalletReport(walletData);
        },
        {
            name: "get_wallet_balance",
            description: "Get your crypto wallet balances across different blockchains",
            schema: z.object({})
        }
    );

    // Create a LangChain tool for total crypto holdings
    const totalCryptoHoldingsTool = tool(
        async () => {
            const { formattedReport } = await getTotalCryptoHoldings(walletService);
            return formattedReport;
        },
        {
            name: "get_total_crypto_holdings",
            description: "Get a summary of your total cryptocurrency holdings including Binance",
            schema: z.object({})
        }
    );

    // Register the tools with LangChain service
    langchainService.registerTools([walletBalanceTool, totalCryptoHoldingsTool]);

    // Register the total holdings capability
    registerTotalCryptoHoldingsIntent(() => getTotalCryptoHoldings(walletService));

    return walletService;
}

export const walletService = new WalletService();
