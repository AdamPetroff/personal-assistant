import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/constants";
import { handleMessage } from "./handlers/messageHandler";
import { handleReply } from "./handlers/replyHandler";
import { logger } from "../utils/logger";
import { initTrelloService, interestsListId } from "../services/trello";
import { CoinMarketCapService, initCoinMarketCapService } from "../services/coinMarketCap";
import cron from "node-cron";
import { OpenAIService } from "../services/openai";
import { initWalletService } from "../services/wallet";
import { createMarkdownSender } from "../utils/markdownFormatter";
import { conversationContextService } from "../services/conversationContext";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
// Create a wrapper for sendMessage with Markdown support (using simpler Markdown mode)
const sendMarkdownMessage = createMarkdownSender(bot, false);

// Enhanced version of sendMarkdownMessage that also stores the message in conversation context
const sendAndTrackMarkdownMessage = async (
    chatId: number | string,
    text: string,
    options: any = {},
    originalMessageId?: number
) => {
    try {
        const sentMessage = await sendMarkdownMessage(chatId, text, options);

        // If this is part of a conversation, store it in the conversation context
        if (originalMessageId) {
            // Get the bot's ID first, then add the message
            const botInfo = await bot.getMe();
            conversationContextService.addMessage(originalMessageId, sentMessage.message_id, botInfo.id, true, text);
        }

        return sentMessage;
    } catch (error) {
        logger.error("Error sending and tracking message:", error);
        throw error;
    }
};

bot.on("polling_error", (error) => {
    logger.error("Polling error:", error);
});

logger.info("Bot is starting...", TELEGRAM_BOT_TOKEN);
bot.getMe().then((botInfo) => {
    logger.info(`Bot is ready! Bot username: ${botInfo.username}`);
});

initTrelloService();
initCoinMarketCapService();

const coinMarketCapService = new CoinMarketCapService();
const trelloService = initTrelloService();
const openaiService = new OpenAIService();
const walletService = initWalletService(coinMarketCapService);

// Example scheduler configuration
interface ScheduledMessage {
    cronExpression: string;
    messageGenerator: () => Promise<string | null>;
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
    },
    {
        // Runs every day at 10 AM
        cronExpression: "0 10 * * *",
        // cronExpression: "*/1 * * * *", // every minute
        messageGenerator: async () => {
            try {
                // Get an incomplete card from interests list
                const interestCards = await trelloService.getCardsInList(interestsListId);
                const incompletedCard = interestCards.find((card) => !card.dueComplete);

                if (!incompletedCard) {
                    console.log("No pending interests to explore today!");
                    return null;
                }

                // Get information about the topic
                const topicInfo = await openaiService.getTopicInformation(incompletedCard.name, incompletedCard.desc);

                // Mark the card as complete
                await trelloService.updateCardCompletion(incompletedCard.id, true);

                return `📚 Daily Learning: *${incompletedCard.name}*\n\n${topicInfo}\n\nHappy learning! 🎯`;
            } catch (error) {
                if (error instanceof Error) {
                    return `Failed to process daily interest: ${error.message}`;
                }
                return "Failed to process daily interest";
            }
        },
        chatIds: [
            // adam
            1958271265
        ]
    },
    {
        // Runs every day at 7AM
        cronExpression: "0 7 * * *",
        messageGenerator: async () => {
            try {
                const walletData = await walletService.getAllWalletsValueUsd();
                return walletService.formatWalletReport(walletData);
            } catch (error) {
                if (error instanceof Error) {
                    return `Sorry, couldn't fetch wallet holdings: ${error.message}`;
                }
                return "Sorry, couldn't fetch wallet holdings";
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
                    if (!message) {
                        return;
                    }
                    // Use the markdown sender with the message as-is (no escaping)
                    const sentMessage = await sendMarkdownMessage(chatId, message);

                    // Store the sent message in the conversation context
                    // Use the message ID as the original message ID (conversation thread ID)
                    const botInfo = await bot.getMe();
                    conversationContextService.addMessage(
                        sentMessage.message_id, // Original message ID (conversation thread ID)
                        sentMessage.message_id, // Message ID
                        botInfo.id, // Bot ID
                        true, // Is bot
                        message // Message text
                    );

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

bot.on("message", async (msg) => {
    try {
        // Check if this is a reply to a message
        if (msg.reply_to_message) {
            const fromId = msg.from?.id || 0;
            logger.info(`Received reply to message ${msg.reply_to_message.message_id} from ${fromId}`);

            // Process the reply
            const { response, threadId } = await handleReply(msg.reply_to_message.message_id, msg.text || "", fromId);

            // Send the response as a reply to the user's message
            await sendAndTrackMarkdownMessage(
                msg.chat.id,
                response,
                { reply_to_message_id: msg.message_id },
                threadId // Use the thread ID instead of the reply_to_message_id
            );
        } else {
            // Process the user's message as a regular message
            const fromId = msg.from?.id || 0;
            logger.info(`Received message from ${fromId}: ${msg.text}`);
            const response = await handleMessage(msg.text || "");

            // Send the response
            const sentMessage = await sendMarkdownMessage(msg.chat.id, response);

            // Store both the user's message and the bot's response in the conversation context
            // This allows future replies to have context
            const botInfo = await bot.getMe();

            // Store the user's message
            conversationContextService.addMessage(
                sentMessage.message_id, // Original message ID (conversation thread ID)
                msg.message_id, // Message ID
                fromId, // User ID
                false, // Not a bot
                msg.text || "" // Message text
            );

            // Store the bot's response
            conversationContextService.addMessage(
                sentMessage.message_id, // Original message ID (conversation thread ID)
                sentMessage.message_id, // Message ID
                botInfo.id, // Bot ID
                true, // Is bot
                response // Message text
            );
        }
    } catch (error) {
        logger.error("Error processing message:", error);
        await sendMarkdownMessage(
            msg.chat.id,
            "Sorry, I encountered an error processing your message. Please try again."
        );
    }
});

bot.on("error", (error) => {
    logger.error("Telegram bot error:", error);
});

export { bot };
