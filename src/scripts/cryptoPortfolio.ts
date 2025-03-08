#!/usr/bin/env node
import { Command } from "commander";
import { getPortfolioService } from "../services/wallet/portfolioService";
import { logger } from "../utils/logger";
import fs from "fs";
import path from "path";

// Initialize the program
const program = new Command();

program.name("crypto-portfolio").description("CLI tool to manage crypto portfolio reports").version("1.0.0");

// Command to generate a report
program
    .command("generate")
    .description("Generate a crypto portfolio report and save it to the database")
    .option("-s, --save-to <path>", "Save the report to a file")
    .action(async (options) => {
        try {
            logger.info("Generating crypto portfolio report...");

            const portfolioService = getPortfolioService();
            const result = await portfolioService.generateAndSaveReport();

            logger.info(`Report saved to database with ID: ${result.reportId}`);
            logger.info(`Total portfolio value: $${result.totalValueUsd.toLocaleString()}`);

            console.log("\n" + result.formattedReport + "\n");

            // Save to file if requested
            if (options.saveTo) {
                const filePath = path.resolve(options.saveTo);
                fs.writeFileSync(filePath, result.formattedReport);
                logger.info(`Report saved to file: ${filePath}`);
            }
        } catch (error) {
            logger.error("Failed to generate report:", error);
            process.exit(1);
        }
    });

// Command to view the latest report
program
    .command("latest")
    .description("View the latest crypto portfolio report")
    .option("-s, --save-to <path>", "Save the report to a file")
    .action(async (options) => {
        try {
            logger.info("Fetching latest crypto portfolio report...");

            const portfolioService = getPortfolioService();
            const result = await portfolioService.getLatestReport();

            if (!result) {
                logger.info("No portfolio reports found. Run the 'generate' command to create one.");
                process.exit(0);
            }

            logger.info(`Report ID: ${result.reportId}`);
            logger.info(`Total portfolio value: $${result.totalValueUsd.toLocaleString()}`);
            logger.info(`Timestamp: ${result.timestamp.toLocaleString()}`);

            console.log("\n" + result.formattedReport + "\n");

            // Save to file if requested
            if (options.saveTo) {
                const filePath = path.resolve(options.saveTo);
                fs.writeFileSync(filePath, result.formattedReport);
                logger.info(`Report saved to file: ${filePath}`);
            }
        } catch (error) {
            logger.error("Failed to fetch latest report:", error);
            process.exit(1);
        }
    });

// Command to get chart data
program
    .command("chart-data")
    .description("Get data for portfolio value chart")
    .option("-d, --days <number>", "Number of days to include", "30")
    .option("-s, --save-to <path>", "Save the chart data to a JSON file")
    .action(async (options) => {
        try {
            const days = parseInt(options.days, 10);
            logger.info(`Fetching portfolio chart data for the last ${days} days...`);

            const portfolioService = getPortfolioService();
            const chartData = await portfolioService.getChartData(days);

            if (chartData.length === 0) {
                logger.info("No portfolio data found for the specified period.");
                process.exit(0);
            }

            logger.info(`Found ${chartData.length} data points.`);

            // Save to file if requested
            if (options.saveTo) {
                const filePath = path.resolve(options.saveTo);
                fs.writeFileSync(filePath, JSON.stringify(chartData, null, 2));
                logger.info(`Chart data saved to file: ${filePath}`);
            } else {
                // Print a sample of the data
                console.log("\nSample data points:");
                chartData.slice(0, 5).forEach((point) => {
                    console.log(`- ${point.timestamp.toLocaleString()}: $${point.totalValueUsd.toLocaleString()}`);
                });
                if (chartData.length > 5) {
                    console.log(`... and ${chartData.length - 5} more data points.`);
                }
            }
        } catch (error) {
            logger.error("Failed to fetch chart data:", error);
            process.exit(1);
        }
    });

// Command to generate chart image
program
    .command("generate-chart")
    .description("Generate a chart image for portfolio value over time")
    .option("-d, --days <number>", "Number of days to include", "30")
    .option("-w, --width <number>", "Chart width in pixels", "800")
    .option("-h, --height <number>", "Chart height in pixels", "400")
    .option("-t, --title <string>", "Chart title")
    .option("-o, --output <path>", "Output directory path", "uploads/charts")
    .option("-f, --filename <string>", "Output filename (without extension)")
    .action(async (options) => {
        try {
            const days = parseInt(options.days, 10);
            const width = parseInt(options.width, 10);
            const height = parseInt(options.height, 10);

            logger.info(`Generating chart for the last ${days} days...`);

            const portfolioService = getPortfolioService();
            const fileName = options.filename ? `${options.filename}.png` : undefined;

            const imagePath = await portfolioService.generateChartImage(days, {
                width,
                height,
                title: options.title,
                outputPath: options.output,
                fileName
            });

            logger.info(`Chart generated successfully!`);
            logger.info(`Chart saved to: ${imagePath}`);

            // Display the path to the image file
            console.log(`\nChart image saved to: ${imagePath}\n`);
        } catch (error) {
            logger.error("Failed to generate chart image:", error);
            process.exit(1);
        }
    });

// Command to cleanup old reports
program
    .command("cleanup")
    .description("Clean up old portfolio reports")
    .option("-d, --keep-days <number>", "Number of days to keep", "365")
    .action(async (options) => {
        try {
            const keepDays = parseInt(options.keepDays, 10);
            logger.info(`Cleaning up portfolio reports older than ${keepDays} days...`);

            const portfolioService = getPortfolioService();
            const deletedCount = await portfolioService.cleanupOldReports(keepDays);

            logger.info(`Cleaned up ${deletedCount} old reports.`);
        } catch (error) {
            logger.error("Failed to clean up old reports:", error);
            process.exit(1);
        }
    });

// Handle unknown commands
program.on("command:*", () => {
    console.error("Invalid command: %s\nSee --help for a list of available commands.", program.args.join(" "));
    process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length === 2) {
    program.help();
}
