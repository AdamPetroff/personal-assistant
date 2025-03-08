import { coinMarketCapService, initCoinMarketCapService } from "../services/coinMarketCap";
import { logger } from "../utils/logger";

/**
 * Test script for the CoinMarketCap Service
 *
 * This script tests the actual API calls to CoinMarketCap
 * without using mocks. It tests both successful and failed scenarios.
 */
async function testCoinMarketCapService() {
    // Initialize the service
    initCoinMarketCapService();

    // Test token price
    try {
        logger.info("Testing getTokenPrice for BTC...");
        const btcPrice = await coinMarketCapService.getTokenPrice("BTC");
        logger.info(`BTC Price: $${btcPrice.price.toFixed(2)}, 24h Change: ${btcPrice.change24h?.toFixed(2)}%`);
    } catch (error) {
        logger.error("Error fetching BTC price:", error);
    }

    // Test token details on different networks
    const testCases = [
        { symbol: "USDC", network: "ethereum" },
        { symbol: "USDT", network: "ethereum" },
        { symbol: "CAKE", network: "bsc" },
        { symbol: "MATIC", network: "polygon" },
        { symbol: "ARB", network: "arbitrum" },
        { symbol: "OP", network: "optimism" },
        { symbol: "AVAX", network: "avalanche" },
        { symbol: "SNSY", network: "ethereum" } // The example token from your query
    ];

    for (const testCase of testCases) {
        try {
            logger.info(`\n=== Testing getTokenDetails for ${testCase.symbol} on ${testCase.network} ===`);
            const tokenDetails = await coinMarketCapService.getTokenDetails(testCase.symbol, testCase.network);

            if (!tokenDetails) {
                logger.warn(`No details found for ${testCase.symbol} on ${testCase.network}`);
                continue;
            }

            logger.info(`Token Name: ${tokenDetails.name}`);
            logger.info(`Token Symbol: ${tokenDetails.symbol}`);

            if (tokenDetails.onChainName) {
                logger.info(`On-chain Name: ${tokenDetails.onChainName}`);
            }

            if (tokenDetails.onChainSymbol) {
                logger.info(`On-chain Symbol: ${tokenDetails.onChainSymbol}`);
            }

            if (tokenDetails.description) {
                // Truncate description if too long
                const maxDescLength = 100;
                const desc =
                    tokenDetails.description.length > maxDescLength
                        ? tokenDetails.description.substring(0, maxDescLength) + "..."
                        : tokenDetails.description;
                logger.info(`Description: ${desc}`);
            }

            if (tokenDetails.category) {
                logger.info(`Category: ${tokenDetails.category}`);
            }

            // Log network and contract address info
            if (tokenDetails.network) {
                logger.info(`Network: ${tokenDetails.network}`);
            }

            if (tokenDetails.contractAddress) {
                logger.info(`Contract Address: ${tokenDetails.contractAddress}`);
            }

            if (tokenDetails.decimals !== undefined) {
                logger.info(`Decimals: ${tokenDetails.decimals}`);
            }

            // Log platform info if available (old field)
            if (tokenDetails.platform) {
                logger.info(`Platform (old field): ${tokenDetails.platform.name}`);
                logger.info(`Contract Address (old field): ${tokenDetails.platform.token_address}`);
            }

            // Log contract_address info if available (raw data)
            if (tokenDetails.contract_address && tokenDetails.contract_address.length > 0) {
                logger.info(`Contract Addresses (raw data):`);
                tokenDetails.contract_address.forEach((contract, index) => {
                    logger.info(
                        `  ${index + 1}. Platform: ${contract.platform.name} (ID: ${contract.platform.coin.id})`
                    );
                    logger.info(`     Address: ${contract.contract_address}`);
                });
            } else {
                logger.info("No contract_address field available in raw data");
            }

            // Log URLs if available
            if (tokenDetails.urls) {
                if (tokenDetails.urls.website && tokenDetails.urls.website.length > 0) {
                    logger.info(`Website: ${tokenDetails.urls.website[0]}`);
                }

                if (tokenDetails.urls.explorer && tokenDetails.urls.explorer.length > 0) {
                    logger.info(`Explorer: ${tokenDetails.urls.explorer[0]}`);
                }
            }
        } catch (error) {
            logger.error(`Error fetching details for ${testCase.symbol} on ${testCase.network}:`, error);
        }
    }
}

// Run the test
testCoinMarketCapService()
    .then(() => {
        logger.info("\nTest completed");
        process.exit(0);
    })
    .catch((error) => {
        logger.error("Test failed:", error);
        process.exit(1);
    });
