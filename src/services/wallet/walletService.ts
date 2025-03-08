import { BlockchainNetwork } from "../blockchain-types";
import { WalletData, TokenBalance, WalletReport, WalletWithValue } from "./types";
import { WalletRepository } from "../database/repositories/WalletRepository";
import { WalletBalanceService } from "./balanceService";
import { WalletReportService } from "./reportService";
import { logger } from "../../utils/logger";
import { coinMarketCapService } from "../coinMarketCap";

export class WalletService {
    private wallets: WalletData[] = [];
    private readonly walletRepository: WalletRepository;
    private readonly balanceService: WalletBalanceService;
    private readonly reportService: WalletReportService;
    private walletsLoadedPromise: Promise<void>;

    constructor() {
        this.walletRepository = new WalletRepository();
        this.balanceService = new WalletBalanceService(coinMarketCapService);
        this.reportService = new WalletReportService();

        // Load wallets from database
        this.walletsLoadedPromise = this.loadWalletsFromDatabase();
    }

    /**
     * Load wallet addresses from the database
     */
    private async loadWalletsFromDatabase() {
        try {
            // Clear existing wallets to prevent duplicates
            this.wallets = [];

            const dbWallets = await this.walletRepository.getAll();
            for (const wallet of dbWallets) {
                this.wallets.push({
                    address: wallet.address,
                    network: wallet.network as BlockchainNetwork,
                    label: wallet.label || undefined
                });
            }
            logger.info(`Loaded ${this.wallets.length} wallets from database`);
        } catch (error) {
            logger.error("Error loading wallets from database:", error);
        }
    }

    /**
     * Add a wallet address to track and save to database
     */
    async addWallet(address: string, network: BlockchainNetwork, label?: string): Promise<void> {
        // Check if wallet already exists
        const exists = this.wallets.some(
            (wallet) => wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === network
        );

        if (exists) {
            logger.info(`Wallet ${address} (${network}) already exists`);
            return;
        }

        // Add to local array
        this.wallets.push({ address, network, label });

        // Add to database
        try {
            await this.walletRepository.create({
                address,
                network,
                label: label || null
            });
        } catch (error) {
            logger.error(`Error adding wallet to database: ${error}`);
            // If database operation fails, remove from local array
            this.wallets = this.wallets.filter(
                (wallet) => wallet.address.toLowerCase() !== address.toLowerCase() || wallet.network !== network
            );
            throw error;
        }
    }

    /**
     * Remove a wallet address and delete from database
     */
    async removeWallet(address: string, network: BlockchainNetwork): Promise<boolean> {
        const initialLength = this.wallets.length;

        // Remove from local array
        this.wallets = this.wallets.filter(
            (wallet) => wallet.address.toLowerCase() !== address.toLowerCase() || wallet.network !== network
        );

        // Remove from database
        try {
            await this.walletRepository.deleteByAddressAndNetwork(address, network);
        } catch (error) {
            logger.error(`Error removing wallet from database: ${error}`);
            // If database operation fails, restore the original state
            await this.loadWalletsFromDatabase();
            throw error;
        }

        return this.wallets.length < initialLength;
    }

    /**
     * Get all tracked wallets
     */
    getWallets(): WalletData[] {
        return [...this.wallets];
    }

    /**
     * Get wallet value in USD
     */
    async getWalletValueUsd(
        address: string,
        network: BlockchainNetwork
    ): Promise<{
        totalValueUsd: number;
        tokenBalances: TokenBalance[];
    }> {
        const tokenBalances = await this.balanceService.fetchTokenBalances(address, network);
        const tokenBalancesWithUsd = await this.balanceService.calculateUsdValues(tokenBalances);

        const totalValueUsd = tokenBalancesWithUsd.reduce((sum, token) => {
            return sum + (token.valueUsd || 0);
        }, 0);

        return {
            totalValueUsd,
            tokenBalances: tokenBalancesWithUsd
        };
    }

    /**
     * Get all wallets value in USD
     */
    async getAllWalletsValueUsd(): Promise<WalletReport> {
        // Ensure wallets are loaded by awaiting the promise
        await this.walletsLoadedPromise;

        logger.info(`Using ${this.wallets.length} wallets to calculate total value`);

        const walletsWithValues: WalletWithValue[] = [];
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
                logger.info(`Added wallet ${wallet.address} with value $${walletValueUsd}`);
            } catch (error) {
                logger.error(`Failed to get value for wallet ${wallet.address} on ${wallet.network}:`, error);
                walletsWithValues.push({
                    ...wallet,
                    valueUsd: 0,
                    tokenBalances: []
                });
            }
        }

        logger.info(`Total wallet value: $${totalValueUsd} from ${walletsWithValues.length} wallets`);
        return {
            totalValueUsd,
            wallets: walletsWithValues
        };
    }

    /**
     * Format wallet holdings report
     */
    formatWalletReport(walletData: WalletReport): string {
        return this.reportService.formatWalletReport(walletData);
    }

    /**
     * Get total crypto holdings including Binance
     */
    async getTotalCryptoHoldings(): Promise<{ totalUsd: number; formattedReport: string }> {
        const walletData = await this.getAllWalletsValueUsd();
        return this.reportService.generateTotalHoldingsReport(walletData);
    }
}
