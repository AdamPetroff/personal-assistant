import { spawn } from "child_process";
import { logger } from "../utils/logger";

/**
 * Script to run all crypto-related service tests
 */
async function runTests() {
    logger.info("Running all crypto service tests...");

    // Run crypto service tests
    logger.info("\n=== Running Crypto Service Tests ===\n");
    await runTest("test-crypto-service.ts");

    // Run CoinMarketCap service tests
    logger.info("\n=== Running CoinMarketCap Service Tests ===\n");
    await runTest("test-coinmarketcap-service.ts");

    logger.info("\nAll tests completed!");
}

/**
 * Run a specific test script
 */
function runTest(scriptName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const testProcess = spawn("npx", ["ts-node", `src/scripts/${scriptName}`], {
            stdio: "inherit"
        });

        testProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Test ${scriptName} failed with code ${code}`));
            }
        });

        testProcess.on("error", (err) => {
            reject(err);
        });
    });
}

// Run all tests
runTests()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        logger.error("Test runner failed:", error);
        process.exit(1);
    });
