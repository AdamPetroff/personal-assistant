import { cryptoService, CryptoService } from "../services/crypto";
import { BlockchainNetwork } from "../services/wallet";
import { logger } from "../utils/logger";

/**
 * Test script for the Crypto Service
 *
 * This script tests the actual API calls to blockchain explorers
 * without using mocks. It tests both successful and failed scenarios.
 */
async function testCryptoService() {
    logger.info("Starting Crypto Service tests...");

    const service: CryptoService = cryptoService();

    // Test 1: Test getNetworkId function
    logger.info("Test 1: Testing getNetworkId function");
    const ethereumId = service.getNetworkId(BlockchainNetwork.ETHEREUM);
    const bscId = service.getNetworkId(BlockchainNetwork.BSC);

    if (ethereumId === 1) {
        logger.info("✅ getNetworkId for Ethereum returned correct ID: 1");
    } else {
        logger.error(`❌ getNetworkId for Ethereum returned incorrect ID: ${ethereumId}, expected: 1`);
    }

    if (bscId === 56) {
        logger.info("✅ getNetworkId for BSC returned correct ID: 56");
    } else {
        logger.error(`❌ getNetworkId for BSC returned incorrect ID: ${bscId}, expected: 56`);
    }

    // Test 2: Test getNetworkFromId function
    logger.info("\nTest 2: Testing getNetworkFromId function");
    const ethereumNetwork = service.getNetworkFromId(1);
    const bscNetwork = service.getNetworkFromId(56);

    if (ethereumNetwork === BlockchainNetwork.ETHEREUM) {
        logger.info("✅ getNetworkFromId for ID 1 returned correct network: ethereum");
    } else {
        logger.error(`❌ getNetworkFromId for ID 1 returned incorrect network: ${ethereumNetwork}, expected: ethereum`);
    }

    if (bscNetwork === BlockchainNetwork.BSC) {
        logger.info("✅ getNetworkFromId for ID 56 returned correct network: bsc");
    } else {
        logger.error(`❌ getNetworkFromId for ID 56 returned incorrect network: ${bscNetwork}, expected: bsc`);
    }

    // Test 3: Test fetchTokenData function with a valid token (USDT on Ethereum)
    logger.info("\nTest 3: Testing fetchTokenData with valid token (USDT on Bsc)");
    try {
        const usdtAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT on Bsc
        const tokenData = await service.fetchTokenData(usdtAddress, BlockchainNetwork.BSC);

        logger.info("Token data fetched successfully:");
        logger.info(`Symbol: ${tokenData.symbol}`);
        logger.info(`Name: ${tokenData.name}`);
        logger.info(`Decimals: ${tokenData.decimals}`);
        logger.info(`Network ID: ${tokenData.networkId}`);

        if (tokenData.symbol === "USDT" && tokenData.decimals === 6) {
            logger.info("✅ fetchTokenData returned correct data for USDT");
        } else {
            logger.error(`❌ fetchTokenData returned incorrect data for USDT: ${JSON.stringify(tokenData)}`);
        }
    } catch (error) {
        logger.error("❌ fetchTokenData failed for valid token:", error);
    }

    // Test 4: Test fetchTokenData function with an invalid token address
    logger.info("\nTest 4: Testing fetchTokenData with invalid token address");
    try {
        const invalidAddress = "0x0000000000000000000000000000000000000000"; // Invalid/Zero address
        await service.fetchTokenData(invalidAddress, BlockchainNetwork.ETHEREUM);
        logger.error("❌ fetchTokenData did not throw error for invalid token address");
    } catch (error) {
        logger.info("✅ fetchTokenData correctly threw error for invalid token address");
        logger.info(`Error message: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Test 5: Test fetchTokenData with a token on Ethereum
    logger.info("\nTest 5: Testing fetchTokenData with token on Ethereum");
    try {
        const ethSNSYAddress = "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34"; // USDT on Ethereum
        const tokenData = await service.fetchTokenData(ethSNSYAddress, BlockchainNetwork.ETHEREUM);

        logger.info("Token data fetched successfully:");
        logger.info(`Symbol: ${tokenData.symbol}`);
        logger.info(`Name: ${tokenData.name}`);
        logger.info(`Decimals: ${tokenData.decimals}`);
        logger.info(`Network ID: ${tokenData.networkId}`);

        if (tokenData.symbol === "SNSY" && tokenData.networkId === 1) {
            logger.info("✅ fetchTokenData returned correct data for SNSY on Ethereum");
        } else {
            logger.error(
                `❌ fetchTokenData returned incorrect data for SNSY on Ethereum: ${JSON.stringify(tokenData)}`
            );
        }
    } catch (error) {
        logger.error("❌ fetchTokenData failed for Ethereum token:", error);
    }

    // Test 6: Test cache functionality
    logger.info("\nTest 6: Testing cache functionality");
    try {
        const usdtAddress = "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34"; // USDT on Ethereum

        console.time("First call");
        await service.fetchTokenData(usdtAddress, BlockchainNetwork.ETHEREUM);
        console.timeEnd("First call");

        console.time("Second call (should be faster due to cache)");
        await service.fetchTokenData(usdtAddress, BlockchainNetwork.ETHEREUM);
        console.timeEnd("Second call (should be faster due to cache)");

        logger.info("✅ Cache test completed - check the timing difference above");
    } catch (error) {
        logger.error("❌ Cache test failed:", error);
    }

    logger.info("\nCrypto Service tests completed!");
}

// Run the tests
testCryptoService()
    .then(() => {
        logger.info("All tests completed");
        process.exit(0);
    })
    .catch((error) => {
        logger.error("Tests failed with error:", error);
        process.exit(1);
    });
