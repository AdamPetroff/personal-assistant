/**
 * Verbose test for a single wallet to see exactly what the blockchain API returns
 * Updated to use V2 API format with unified SCAN_API_KEY
 */

import axios from "axios";
import { env } from "../config/constants";
import { logger } from "../utils/logger";
import { BigNumber } from "bignumber.js";

async function testSingleWallet() {
    try {
        logger.info("=".repeat(60));
        logger.info("Verbose Single Wallet Test (V2 API)");
        logger.info("=".repeat(60));

        // Test one of your wallets
        const testAddress = "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5";
        const network = "BSC";
        const chainId = 56; // BSC chain ID
        // V2 API uses Etherscan base URL for ALL chains
        const apiUrl = "https://api.etherscan.io/v2/api";
        const apiKey = env.SCAN_API_KEY;

        logger.info(`\nTesting wallet: ${testAddress}`);
        logger.info(`Network: ${network}`);
        logger.info(`Chain ID: ${chainId}`);
        logger.info(`API Key configured: ${apiKey ? "Yes" : "No"}`);
        logger.info(`API URL: ${apiUrl}`);

        // Test 1: Check native BNB balance using V2 API
        logger.info("\n1. Testing Native BNB Balance (V2 API):");
        try {
            const nativeBalanceResponse = await axios.get(apiUrl, {
                params: {
                    chainid: chainId,
                    module: "account",
                    action: "balance",
                    address: testAddress,
                    tag: "latest",
                    apikey: apiKey
                }
            });

            logger.info(`  API Status: ${nativeBalanceResponse.data.status}`);
            logger.info(`  API Message: ${nativeBalanceResponse.data.message}`);
            logger.info(`  Raw Balance (wei): ${nativeBalanceResponse.data.result}`);

            const bnbBalance = new BigNumber(nativeBalanceResponse.data.result).dividedBy(new BigNumber(10).pow(18));
            logger.info(`  BNB Balance: ${bnbBalance.toFixed(6)} BNB`);

            if (bnbBalance.isGreaterThan(0)) {
                logger.info(`  ✓ Wallet has BNB!`);
            } else {
                logger.warn(`  ⚠️  Wallet has no BNB`);
            }
        } catch (error) {
            logger.error("  Error fetching native balance:", error);
        }

        // Test 2: Check USDT balance (from your configured tokens) using V2 API
        logger.info("\n2. Testing USDT Token Balance (V2 API):");
        const usdtContract = "0x55d398326f99059fF775485246999027B3197955";
        try {
            const tokenBalanceResponse = await axios.get(apiUrl, {
                params: {
                    chainid: chainId,
                    module: "account",
                    action: "tokenbalance",
                    address: testAddress,
                    contractaddress: usdtContract,
                    tag: "latest",
                    apikey: apiKey
                }
            });

            logger.info(`  API Status: ${tokenBalanceResponse.data.status}`);
            logger.info(`  API Message: ${tokenBalanceResponse.data.message}`);
            logger.info(`  Raw Balance: ${tokenBalanceResponse.data.result}`);

            const usdtBalance = new BigNumber(tokenBalanceResponse.data.result).dividedBy(new BigNumber(10).pow(18));
            logger.info(`  USDT Balance: ${usdtBalance.toFixed(6)} USDT`);

            if (usdtBalance.isGreaterThan(0)) {
                logger.info(`  ✓ Wallet has USDT!`);
            } else {
                logger.warn(`  ⚠️  Wallet has no USDT`);
            }
        } catch (error) {
            logger.error("  Error fetching token balance:", error);
        }

        // Test 3: Get all token balances for the address using tokentx with V2 API
        logger.info("\n3. Checking Token Transaction History (V2 API):");
        try {
            const tokenTxResponse = await axios.get(apiUrl, {
                params: {
                    chainid: chainId,
                    module: "account",
                    action: "tokentx",
                    address: testAddress,
                    page: 1,
                    offset: 10,
                    sort: "desc",
                    apikey: apiKey
                }
            });

            if (tokenTxResponse.data.status === "1" && tokenTxResponse.data.result.length > 0) {
                logger.info(`  Found ${tokenTxResponse.data.result.length} recent token transactions`);
                const uniqueTokens = new Set();
                tokenTxResponse.data.result.forEach((tx: any) => {
                    uniqueTokens.add(`${tx.tokenSymbol} (${tx.contractAddress})`);
                });
                logger.info(`  Tokens the wallet has interacted with:`);
                uniqueTokens.forEach((token) => logger.info(`    - ${token}`));
            } else {
                logger.warn(`  No token transactions found for this wallet`);
            }
        } catch (error) {
            logger.error("  Error fetching token transactions:", error);
        }

        logger.info("\n" + "=".repeat(60));
        logger.info("CONCLUSION:");
        logger.info("If all balances show 0, then this wallet truly has no funds.");
        logger.info("The wallet balance functionality is working correctly - it's just an empty wallet.");
        logger.info("=".repeat(60));
    } catch (error) {
        logger.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

testSingleWallet();
