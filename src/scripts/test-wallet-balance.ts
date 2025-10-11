/**
 * Test script for wallet balance functionality
 *
 * This script tests the wallet balance service to diagnose why it might be returning 0.
 *
 * Usage:
 *   npm run test-wallet-balance
 */

import { WalletService } from "../services/wallet/walletService";
import { logger } from "../utils/logger";
import { env } from "../config/constants";

async function testWalletBalance() {
    try {
        logger.info("=".repeat(60));
        logger.info("Starting Wallet Balance Test");
        logger.info("=".repeat(60));

        // Check environment variables
        logger.info("\n1. Checking Environment Variables:");
        const requiredEnvVars = {
            SCAN_API_KEY: env.SCAN_API_KEY,
            SOLSCAN_API_KEY: env.SOLSCAN_API_KEY,
            COIN_MARKET_CAP_API_KEY: env.COIN_MARKET_CAP_API_KEY
        };

        for (const [key, value] of Object.entries(requiredEnvVars)) {
            logger.info(`  ${key}: ${value ? "✓ Configured" : "✗ Missing"}`);
        }

        // Initialize wallet service
        logger.info("\n2. Initializing Wallet Service...");
        const walletService = new WalletService();

        // Wait a bit for wallets to load from database
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get all tracked wallets
        logger.info("\n3. Fetching Tracked Wallets from Database:");
        const wallets = walletService.getWallets();

        if (wallets.length === 0) {
            logger.warn("  ⚠️  No wallets found in database!");
            logger.info("  This is likely why the balance is returning 0.");
            logger.info("  You need to add wallets to track first.");
            logger.info("\n  Example: You can add a wallet via the Telegram bot or directly to the database.");
            return;
        }

        logger.info(`  Found ${wallets.length} wallet(s):`);
        wallets.forEach((wallet, index) => {
            logger.info(`    ${index + 1}. ${wallet.label || "Unlabeled"}: ${wallet.address} (${wallet.network})`);
        });

        // Test fetching balance for each wallet
        logger.info("\n4. Fetching Balances for Each Wallet:");
        for (const wallet of wallets) {
            logger.info(`\n  Testing wallet: ${wallet.address} (${wallet.network})`);

            try {
                const { totalValueUsd, tokenBalances } = await walletService.getWalletValueUsd(
                    wallet.address,
                    wallet.network
                );

                logger.info(`    Total Value: $${totalValueUsd.toFixed(2)}`);

                if (tokenBalances.length === 0) {
                    logger.warn(`    ⚠️  No token balances found for this wallet`);
                } else {
                    logger.info(`    Token Balances (${tokenBalances.length}):`);
                    tokenBalances.forEach((token) => {
                        const balanceStr = token.balance.toFixed(4);
                        const valueStr = token.valueUsd ? `($${token.valueUsd.toFixed(2)})` : "(price unavailable)";
                        logger.info(`      - ${token.symbol}: ${balanceStr} ${valueStr}`);
                    });
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`    ❌ Error fetching balance: ${errorMessage}`);
                if (typeof error === "object" && error !== null && "response" in error) {
                    const axiosError = error as { response?: { data?: unknown } };
                    if (axiosError.response?.data) {
                        logger.error(`    API Response: ${JSON.stringify(axiosError.response.data)}`);
                    }
                }
            }
        }

        // Get total value across all wallets
        logger.info("\n5. Calculating Total Value Across All Wallets:");
        const walletReport = await walletService.getAllWalletsValueUsd();

        logger.info(`  Total Portfolio Value: $${walletReport.totalValueUsd.toFixed(2)}`);
        logger.info(`  Number of wallets with value: ${walletReport.wallets.filter((w) => w.valueUsd > 0).length}`);

        // Generate formatted report
        logger.info("\n6. Formatted Report:");
        const report = walletService.formatWalletReport(walletReport);
        console.log("\n" + report);

        logger.info("\n" + "=".repeat(60));
        logger.info("Wallet Balance Test Completed");
        logger.info("=".repeat(60));

        // Diagnose issues
        if (walletReport.totalValueUsd === 0) {
            logger.warn("\n⚠️  DIAGNOSIS: Total value is $0");
            logger.info("Possible reasons:");
            logger.info("  1. Wallets have no token balances (empty wallets)");
            logger.info("  2. API keys for blockchain explorers are missing or invalid");
            logger.info("  3. No tokens configured in database for the wallet's network");
            logger.info("  4. API rate limits exceeded");
            logger.info("  5. Network connectivity issues");
            logger.info("\nCheck the logs above for specific errors.");
        }
    } catch (error) {
        logger.error("Test failed with error:", error);
        throw error;
    } finally {
        // Exit the process when done
        process.exit(0);
    }
}

// Run the test
testWalletBalance();
