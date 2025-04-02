import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";

const WEB_APP_URL = "https://personal-assistant-ui.vercel.app/";

/**
 * Set up Telegram Web App handlers for the bot
 */
export function setupWebAppHandlers(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) {
    // Web app command
    bot.onText(/\/web/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            // Send message with button to open web app
            await bot.sendMessage(chatId, "Click the button below to open the web app:", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Open Web App",
                                web_app: { url: WEB_APP_URL }
                            }
                        ]
                    ]
                }
            });

            logger.info(`Web app button sent to chat ${chatId}`);
        } catch (error) {
            logger.error("Error opening web app:", error);
            await sendMarkdownMessage(chatId, "Sorry, there was an error opening the web app. Please try again.");
        }
    });
}
