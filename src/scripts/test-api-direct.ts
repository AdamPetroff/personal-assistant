/**
 * Direct API test to check if BSCScan API is working
 */

import axios from "axios";
import { env } from "../config/constants";
import { logger } from "../utils/logger";

async function testApiDirect() {
    const testAddress = "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5";
    const apiKey = env.SCAN_API_KEY;

    logger.info("Testing BSCScan API directly...");
    logger.info(`API Key: ${apiKey?.substring(0, 10)}...`);

    // Try with different URL formats
    const tests = [
        {
            name: "V1 API format (current)",
            url: `https://api.bscscan.com/api?module=account&action=balance&address=${testAddress}&tag=latest&apikey=${apiKey}`
        },
        {
            name: "V2 API format (try 1)",
            url: `https://api.bscscan.com/v2/api?chainid=56&module=account&action=balance&address=${testAddress}&apikey=${apiKey}`
        },
        {
            name: "V2 API format (try 2)",
            url: `https://api.bscscan.com/v2/api?chainid=56&module=account&action=balance&address=${testAddress}&tag=latest&apikey=${apiKey}`
        }
    ];

    for (const test of tests) {
        logger.info(`\n${test.name}:`);
        try {
            const response = await axios.get(test.url);
            logger.info(`  Status: ${response.data.status}`);
            logger.info(`  Message: ${response.data.message}`);
            logger.info(
                `  Result: ${typeof response.data.result === "string" ? response.data.result.substring(0, 100) : JSON.stringify(response.data.result).substring(0, 100)}`
            );

            if (response.data.status === "1") {
                logger.info(`  ✓ SUCCESS! This format works!`);
            }
        } catch (error: any) {
            logger.error(`  Error: ${error.message}`);
        }
    }

    process.exit(0);
}

testApiDirect();
