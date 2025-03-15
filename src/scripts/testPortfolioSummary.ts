import TelegramBot from "node-telegram-bot-api";
import { sendPortfolioSummary } from "../bot/schedulers/scheduledMessages";
import { env } from "../config/constants";
import { logger } from "../utils/logger";

// Default chat ID (Adam's chat ID)
const DEFAULT_CHAT_ID = 1958271265;
// You can override this with a command line argument

async function runTest() {
    try {
        // Get chat ID from command line args if provided
        const chatId = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_CHAT_ID;

        // Initialize the bot
        const botToken = env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
        }

        const bot = new TelegramBot(botToken, { polling: false });

        // Define a simple wrapper for sendMarkdownMessage
        const sendMarkdownMessage = async (chatId: number | string, text: string, options?: any) => {
            return await bot.sendMessage(chatId, text, {
                parse_mode: "Markdown",
                ...options
            });
        };

        logger.info(`Sending portfolio summary to chat ID: ${chatId}`);

        // Send the portfolio summary
        await sendPortfolioSummary(bot, sendMarkdownMessage, chatId);

        logger.info("Test completed successfully");
    } catch (error) {
        logger.error("Test failed:", error);
    } finally {
        // Exit the process when done
        process.exit(0);
    }
}

// Run the test
runTest();
