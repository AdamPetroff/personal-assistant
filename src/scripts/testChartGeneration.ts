#!/usr/bin/env node
import { getCryptoPortfolioService } from "../services/wallet/cryptoPortfolioService";
import { logger } from "../utils/logger";
import fs from "fs";
import path from "path";

async function testChartGeneration() {
    try {
        logger.info("Testing chart generation...");

        const portfolioService = getCryptoPortfolioService();

        // Generate a chart image
        const imagePath = await portfolioService.generateChartImage(30, {
            width: 1000,
            height: 500,
            title: "Crypto Portfolio Test Chart"
        });

        logger.info(`Chart generated successfully!`);
        logger.info(`Chart saved to: ${imagePath}`);

        // Display the absolute path to the image file
        const absolutePath = path.resolve(imagePath);
        console.log(`\nChart image saved to: ${absolutePath}\n`);

        // Output API endpoints that can be used to generate charts
        console.log("API Endpoints for chart generation:");
        console.log("1. Generate chart image and get URL:");
        console.log("   GET /api/portfolio/chart-image?days=30&width=800&height=400&title=My%20Portfolio\n");

        console.log("2. View chart image directly:");
        console.log("   GET /api/portfolio/chart-image/view?days=30&width=800&height=400&title=My%20Portfolio\n");
    } catch (error) {
        logger.error("Failed to test chart generation:", error);
        process.exit(1);
    }
}

// Run the test
testChartGeneration().catch((error) => {
    logger.error("Unhandled error:", error);
    process.exit(1);
});
