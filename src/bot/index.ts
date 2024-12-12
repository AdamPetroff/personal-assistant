import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/constants";
import { handleMessage } from "./handlers/messageHandler";
import { logger } from "../utils/logger";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

bot.on("polling_error", (error) => {
    logger.error("Polling error:", error);
});

logger.info("Bot is starting...", TELEGRAM_BOT_TOKEN);
bot.getMe().then((botInfo) => {
    logger.info(`Bot is ready! Bot username: ${botInfo.username}`);
});

bot.on("message", async (ctx) => {
    const response = await handleMessage(ctx.text);
    await bot.sendMessage(ctx.chat.id, response);
});

bot.on("error", (error) => {
    logger.error("Telegram bot error:", error);
});

export { bot };
