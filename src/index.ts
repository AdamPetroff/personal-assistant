import { logger } from "./utils/logger";
import { bot } from "./bot";
import "./services/twillio";
import { twilioController } from "./controllers/twilioController";
import express from "express";
import { CoinMarketCapService, initCoinMarketCapService } from "./services/coinMarketCap";
import { initWalletService } from "./services/wallet";
import { initBinanceService } from "./services/binance";
import { registerCurrencyConversionIntent } from "./services/openai";

async function startApp() {
    try {
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

app.listen(80, () => {
    logger.info("Server is running on port 80");
});
