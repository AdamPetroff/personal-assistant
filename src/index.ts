import { logger } from "./utils/logger";
import { bot } from "./bot";
import "./services/twillio";
import express from "express";
import { initCoinMarketCapService } from "./services/coinMarketCap";
import { initWalletService } from "./services/wallet";
import { initBinanceService } from "./services/binance";
import { registerCurrencyConversionIntent } from "./services/exchangeRate";
import { testConnection } from "./services/database/client";
import { fileService } from "./services/fileService";
import { initCryptoService } from "./services/crypto";
import { scheduleRaiffeisenEmailProcessing } from "./cron/raiffeisenEmailProcessor";
import { schedulePortfolioSnapshot } from "./cron/portfolioSnapshotProcessor";
import { scheduleXtbEmailProcessing } from "./cron/xtbEmailProcessor";
import { initFinanceChartService } from "./services/chart/financeChartService";
import { initRemindersService } from "./services/reminders";
import { initTrelloService } from "./services/trello";
import { initInterestService } from "./services/interestService";
import { initFinanceAnalysisService } from "./services/financeAnalysisService";
import registerRoutes from "./router";
import { env } from "./config/constants";

async function startApp() {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.error("Failed to connect to the database");
            process.exit(1);
        }

        // Initialize services
        initCoinMarketCapService();
        initWalletService();
        initBinanceService();
        initCryptoService();
        initFinanceChartService();
        initRemindersService();
        initTrelloService();
        initInterestService();
        initFinanceAnalysisService();

        // Interest service is auto-initialized via the import
        logger.info("Interest tracking service initialized");

        logger.info("Assets tracker service initialized");

        // Check file service configuration
        if (fileService.isConfigured()) {
            logger.info("File service initialized with S3 configuration");
        } else {
            logger.warn("File service initialized but S3 is not properly configured");
        }

        // Register AI intents
        registerCurrencyConversionIntent();

        // Schedule cron jobs
        scheduleRaiffeisenEmailProcessing();
        schedulePortfolioSnapshot();
        scheduleXtbEmailProcessing();

        // Start the bot
        await bot.startPolling();

        logger.info("Application started successfully");
    } catch (error) {
        logger.error("Failed to start application:", error);
        process.exit(1);
    }
}

startApp();

process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error);
    process.exit(1);
});

process.on("unhandledRejection", (error) => {
    logger.error("Unhandled rejection:", error);
    process.exit(1);
});

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

registerRoutes(app);

// Listen on all interfaces (0.0.0.0) on the specified port
app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`Server is running on port ${env.PORT}`);
});
