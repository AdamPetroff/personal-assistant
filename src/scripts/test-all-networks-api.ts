/**
 * Test API calls across different blockchain explorers
 */

import axios from "axios";
import { env } from "../config/constants";
import { logger } from "../utils/logger";

async function testAllNetworks() {
    const tests = [
        {
            name: "Ethereum",
            url: "https://api.etherscan.io/v2/api",
            chainId: 1,
            address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
            apiKey: env.SCAN_API_KEY
        },
        {
            name: "BSC",
            url: "https://api.etherscan.io/v2/api",
            chainId: 56,
            address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
            apiKey: env.SCAN_API_KEY
        },
        {
            name: "Polygon",
            url: "https://api.etherscan.io/v2/api",
            chainId: 137,
            address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
            apiKey: env.SCAN_API_KEY
        },
        {
            name: "Base",
            url: "https://api.etherscan.io/v2/api",
            chainId: 8453,
            address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
            apiKey: env.SCAN_API_KEY
        }
    ];

    for (const test of tests) {
        logger.info(`\n${"=".repeat(60)}`);
        logger.info(test.name);
        logger.info("=".repeat(60));

        try {
            const response = await axios.get(test.url, {
                params: {
                    chainid: test.chainId,
                    module: "account",
                    action: "balance",
                    address: test.address,
                    tag: "latest",
                    apikey: test.apiKey
                }
            });

            logger.info(`Status: ${response.data.status}`);
            logger.info(`Message: ${response.data.message}`);

            if (response.data.status === "1") {
                logger.info(`✓ API WORKING`);
                logger.info(`Balance (wei): ${response.data.result}`);
            } else {
                logger.error(`✗ API ERROR`);
                logger.error(`Error message: ${response.data.result}`);
            }
        } catch (error: any) {
            logger.error(`✗ Request failed: ${error.message}`);
        }
    }

    logger.info(`\n${"=".repeat(60)}`);
    logger.info("Test Complete");
    logger.info("=".repeat(60));

    process.exit(0);
}

testAllNetworks();
