/**
 * Debug script to check token configuration in the database
 *
 * This helps diagnose why wallet balances might be $0
 */

import { TokenService } from "../services/wallet/tokenService";
import { BlockchainNetwork } from "../services/blockchain-types";
import { logger } from "../utils/logger";

async function debugTokens() {
    try {
        logger.info("=".repeat(60));
        logger.info("Token Configuration Debug");
        logger.info("=".repeat(60));

        const tokenService = new TokenService();

        // Get all tokens
        logger.info("\n1. Fetching All Tokens from Database:");
        const allTokens = await tokenService.getAllTokens();

        if (allTokens.length === 0) {
            logger.warn("  ⚠️  NO TOKENS FOUND IN DATABASE!");
            logger.info("\n  This is the root cause of the issue!");
            logger.info("  The wallet balance service only checks balances for tokens configured in the database.");
            logger.info(
                "  It also checks native tokens (ETH, BNB, MATIC, etc.) but your wallets appear to have no native tokens either."
            );
            logger.info("\n  SOLUTION: Add tokens to track using the token manager:");
            logger.info("    npm run token-manager add");
        } else {
            logger.info(`  Found ${allTokens.length} token(s) total:`);

            // Group tokens by network
            const tokensByNetwork = new Map<BlockchainNetwork, typeof allTokens>();
            for (const token of allTokens) {
                if (!tokensByNetwork.has(token.network)) {
                    tokensByNetwork.set(token.network, []);
                }
                tokensByNetwork.get(token.network)!.push(token);
            }

            // Display tokens grouped by network
            for (const [network, tokens] of tokensByNetwork) {
                logger.info(`\n  ${network.toUpperCase()}:`);
                tokens.forEach((token) => {
                    logger.info(`    - ${token.symbol} (${token.name})`);
                    logger.info(`      Contract: ${token.contractAddress}`);
                    logger.info(`      Decimals: ${token.decimals}`);
                });
            }

            // Check which networks have tokens configured
            logger.info("\n2. Network Coverage:");
            const networks = Object.values(BlockchainNetwork);
            for (const network of networks) {
                const networkTokens = await tokenService.getTokensByNetwork(network);
                const status = networkTokens.length > 0 ? "✓" : "✗";
                logger.info(`  ${status} ${network}: ${networkTokens.length} token(s)`);
            }
        }

        logger.info("\n" + "=".repeat(60));
        logger.info("Debug Completed");
        logger.info("=".repeat(60));
    } catch (error) {
        logger.error("Debug failed:", error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run the debug
debugTokens();
