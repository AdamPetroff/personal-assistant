import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";

// Type definitions
type CallbackQueryHandler = (
    query: TelegramBot.CallbackQuery,
    bot: TelegramBot,
    sendMarkdownMessage: any
) => Promise<void>;

interface CallbackQueryHandlerRegistration {
    pattern: string | RegExp;
    handler: CallbackQueryHandler;
    description?: string;
}

// Store for registered handlers
const callbackQueryHandlers: CallbackQueryHandlerRegistration[] = [];

/**
 * Register a handler for a specific callback query pattern
 */
export function registerCallbackQueryHandler(
    pattern: string | RegExp,
    handler: CallbackQueryHandler,
    description?: string
): void {
    callbackQueryHandlers.push({ pattern, handler, description });
    logger.info(
        `Registered callback handler for pattern: ${pattern.toString()}${description ? ` - ${description}` : ""}`
    );
}

/**
 * Setup callback query handlers for the bot
 */
export function setupCallbackQueryHandlers(bot: TelegramBot, sendMarkdownMessage: any): void {
    bot.on("callback_query", async (query) => {
        try {
            const callbackData = query.data;

            if (!callbackData) {
                logger.warn("Received callback query with no data");
                return;
            }

            logger.debug(`Received callback query: ${callbackData}`);

            // Find matching handler
            const matchingHandler = callbackQueryHandlers.find(({ pattern }) => {
                if (pattern instanceof RegExp) {
                    return pattern.test(callbackData);
                }
                return callbackData.startsWith(pattern);
            });

            if (matchingHandler) {
                await matchingHandler.handler(query, bot, sendMarkdownMessage);
            } else {
                logger.warn(`No handler found for callback query: ${callbackData}`);
                await bot.answerCallbackQuery(query.id, {
                    text: "Sorry, I don't know how to handle this action."
                });
            }
        } catch (error) {
            logger.error("Error handling callback query:", error);
            try {
                await bot.answerCallbackQuery(query.id, {
                    text: "An error occurred while processing your request."
                });
            } catch (e) {
                logger.error("Error sending callback query answer:", e);
            }
        }
    });

    logger.info(`Setup ${callbackQueryHandlers.length} callback query handlers`);
}
