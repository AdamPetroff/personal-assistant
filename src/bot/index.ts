import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/constants";
import { logger } from "../utils/logger";
import { initTrelloService } from "../services/trello";
import { initRemindersService } from "../services/reminders";
import { initCoinMarketCapService, CoinMarketCapService, coinMarketCapService } from "../services/coinMarketCap";
import { OpenAIService } from "../services/openai";
import { initWalletService, walletService } from "../services/wallet";
import { createMarkdownSender } from "../utils/markdownFormatter";
import { setupMessageHandlers } from "./handlers/messageHandlers";
import { setupFileHandlers } from "./handlers/fileHandlers";
import { setupScheduledMessages } from "./schedulers/scheduledMessages";
import { setupCommandHandlers } from "./handlers/commandHandlers";

// Initialize the bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Create a wrapper for sendMessage with Markdown support (using simpler Markdown mode)
const sendMarkdownMessage = createMarkdownSender(bot, false);

// Set up error handling
bot.on("polling_error", (error) => {
    logger.error("Polling error:", error);
});

bot.on("error", (error) => {
    logger.error("Telegram bot error:", error);
});

// Log bot startup
logger.info("Bot is starting...");
bot.getMe().then((botInfo) => {
    logger.info(`Bot is ready! Bot username: ${botInfo.username}`);
});

// Set up all handlers
setupMessageHandlers(bot, sendMarkdownMessage);
setupFileHandlers(bot, sendMarkdownMessage);
setupCommandHandlers(bot, sendMarkdownMessage);
setupScheduledMessages(bot, sendMarkdownMessage, coinMarketCapService, walletService);

export { bot, sendMarkdownMessage };
