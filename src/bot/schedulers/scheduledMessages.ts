import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { conversationContextService } from "../../services/conversationContext";
import cron from "node-cron";
import { CoinMarketCapService } from "../../services/coinMarketCap";
import { OpenAIService } from "../../services/openai";
import { initTrelloService, interestsListId } from "../../services/trello";

// Interface for scheduled messages
interface ScheduledMessage {
    cronExpression: string;
    messageGenerator: () => Promise<string | null>;
    chatIds: number[];
}

/**
 * Set up scheduled messages for the bot
 */
export function setupScheduledMessages(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>,
    coinMarketCapService: CoinMarketCapService,
    openaiService: OpenAIService,
    walletService: any
) {
    const trelloService = initTrelloService();

    // Define scheduled messages
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
                    const topicInfo = await openaiService.getTopicInformation(
                        incompletedCard.name,
                        incompletedCard.desc
                    );

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
}
