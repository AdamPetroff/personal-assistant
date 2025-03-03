import { logger } from "./utils/logger";
import { bot } from "./bot";
import "./services/twillio";
import { twilioController } from "./controllers/twilioController";
import express from "express";
import { CoinMarketCapService, initCoinMarketCapService } from "./services/coinMarketCap";
import { initWalletService } from "./services/wallet";
import { initBinanceService } from "./services/binance";
import { registerCurrencyConversionIntent } from "./services/openai";
import { testConnection } from "./services/database/client";

// Get port from environment variable or use default
const PORT = parseInt(process.env.PORT || "3000", 10);

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
        const coinMarketCapService = new CoinMarketCapService();
        const walletService = initWalletService(coinMarketCapService);
        const binanceService = initBinanceService(coinMarketCapService);

        // Register AI intents
        registerCurrencyConversionIntent();

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
app.post("/twiml/echo", twilioController.handleEchoStream);

app.get("/", (req, res) => {
    res.send("Hello World");
});

// Listen on all interfaces (0.0.0.0) on the specified port
app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server is running on port ${PORT}`);
});
