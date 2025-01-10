import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/constants";
import { handleMessage } from "./handlers/messageHandler";
import { logger } from "../utils/logger";
import { initTrelloService } from "../services/trello";
import { CoinMarketCapService } from "../services/coinMarketCap";
import cron from "node-cron";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

bot.on("polling_error", (error) => {
    logger.error("Polling error:", error);
});

logger.info("Bot is starting...", TELEGRAM_BOT_TOKEN);
bot.getMe().then((botInfo) => {
    logger.info(`Bot is ready! Bot username: ${botInfo.username}`);
});

initTrelloService();

const coinMarketCapService = new CoinMarketCapService();

// Example scheduler configuration
interface ScheduledMessage {
    cronExpression: string;
    messageGenerator: () => Promise<string>;
    chatIds: number[];
}

const scheduledMessages: ScheduledMessage[] = [
    {
        // Runs every day at 9AM
        cronExpression: "0 9 * * *",
        messageGenerator: async () => {
            try {
                const { price, change24h } = await coinMarketCapService.getTokenPrice("BTC");
                return coinMarketCapService.formatPriceMessage("BTC", price, change24h);
            } catch (error) {
                if (error instanceof Error) {
                    return `Sorry, couldn't fetch Bitcoin price: ${error.message}`;
                }
                return "Sorry, couldn't fetch Bitcoin price";
            }
        },
        chatIds: [
            // adam
            1958271265
        ]
    }
];

// Initialize schedulers
scheduledMessages.forEach((schedule) => {
    cron.schedule(
        schedule.cronExpression,
        async () => {
            for (const chatId of schedule.chatIds) {
                try {
                    const message = await schedule.messageGenerator();
                    await bot.sendMessage(chatId, message);
                    logger.info(`Scheduled message sent to ${chatId}`);
                } catch (error) {
                    logger.error(`Failed to send scheduled message to ${chatId}:`, error);
                }
            }
        },
        {
            timezone: "Europe/Berlin"
        }
    );
});

bot.on("message", async (ctx) => {
    console.log("ctx", ctx);
    const response = await handleMessage(ctx.text || "");
    await bot.sendMessage(ctx.chat.id, response);
});

bot.on("error", (error) => {
    logger.error("Telegram bot error:", error);
});

export { bot };
