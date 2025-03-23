import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { conversationContextService } from "../../services/conversationContext";
import cron from "node-cron";
import { CoinMarketCapService } from "../../services/coinMarketCap";
import { remindersService } from "../../services/reminders";
import { langchainService } from "../../services/langchain";
import { generatePortfolioSummaryMessage } from "./portfolioSummaryMessage";
import { interestService } from "../../services/interestService";

// Interface for scheduled messages
interface ScheduledMessage {
    cronExpression: string;
    messageGenerator: () => Promise<string | null>;
    chatIds: number[];
}

const adamChatId = 1958271265;

/**
 * Send portfolio summary with chart to a specific chat
 */
export async function sendPortfolioSummary(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>,
    chatId: number
): Promise<void> {
    try {
        // Get the full result with potential image
        const summaryResult = await generatePortfolioSummaryMessage();
        if (!summaryResult) return;

        // If we have an image buffer, send it with the message
        if (summaryResult.imageBuffer) {
            // Send the chart image with caption
            await bot.sendPhoto(chatId, summaryResult.imageBuffer, {
                caption: summaryResult.text,
                parse_mode: "Markdown"
            });
        } else {
            // Just send the text if no image
            await sendMarkdownMessage(chatId, summaryResult.text);
        }

        logger.info(`Portfolio summary sent to ${chatId}`);
    } catch (error) {
        logger.error(`Failed to send portfolio summary to ${chatId}:`, error);

        // Send error message if summary generation failed
        try {
            await sendMarkdownMessage(chatId, "Sorry, couldn't generate portfolio summary. Check logs for details.");
        } catch (sendError) {
            logger.error(`Failed to send error message to ${chatId}:`, sendError);
        }
    }
}

/**
 * Set up scheduled messages for the bot
 */
export function setupScheduledMessages(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>,
    coinMarketCapService: CoinMarketCapService
) {
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
            chatIds: [adamChatId]
        },
        {
            // Runs every day at 10 AM
            cronExpression: "0 10 * * *",
            // cronExpression: "*/1 * * * *", // every minute
            messageGenerator: async () => {
                try {
                    // Get all interests from the database
                    const interests = await interestService.getInterests();

                    // Skip if no interests
                    if (interests.length === 0) {
                        console.log("No interests to explore today!");
                        return null;
                    }

                    // Select a random interest
                    const randomIndex = Math.floor(Math.random() * interests.length);
                    const selectedInterest = interests[randomIndex];

                    // Get information about the topic
                    const topicInfo = await langchainService.getTopicInformation(
                        selectedInterest.topic,
                        selectedInterest.description || ""
                    );

                    return `📚 Daily Learning: *${selectedInterest.topic}*\n\n${topicInfo}\n\nHappy learning! 🎯`;
                } catch (error) {
                    if (error instanceof Error) {
                        return `Failed to process daily interest: ${error.message}`;
                    }
                    return "Failed to process daily interest";
                }
            },
            chatIds: [adamChatId]
        }
    ];

    // Add reminder check scheduler
    cron.schedule(
        "* * * * *", // Check every minute
        async () => {
            try {
                // Get upcoming reminders
                const reminders = await remindersService.getUpcomingReminders();

                // Find reminders that are due in the next minute
                const now = new Date();
                const oneMinuteFromNow = new Date(now.getTime() + 1 * 60 * 1000);

                const dueReminders = reminders.filter((reminder) => {
                    const reminderTime = new Date(reminder.reminderTime);
                    return reminderTime >= now && reminderTime <= oneMinuteFromNow;
                });

                // Send notifications for due reminders
                for (const reminder of dueReminders) {
                    for (const chatId of [adamChatId]) {
                        // adam's chat ID
                        try {
                            const message = `⏰ *Reminder*: ${reminder.title}${reminder.description ? `\n\n${reminder.description}` : ""}`;
                            const sentMessage = await sendMarkdownMessage(chatId, message);

                            // Mark reminder as completed
                            await remindersService.updateReminderCompletion(reminder.id, true);

                            // Store the sent message in the conversation context
                            const botInfo = await bot.getMe();
                            conversationContextService.addMessage(
                                sentMessage.message_id,
                                sentMessage.message_id,
                                botInfo.id,
                                true,
                                message
                            );

                            logger.info(`Reminder notification sent to ${chatId} for reminder: ${reminder.title}`);
                        } catch (error) {
                            logger.error(`Failed to send reminder notification to ${chatId}:`, error);
                        }
                    }
                }
            } catch (error) {
                logger.error("Failed to process reminders:", error);
            }
        },
        {
            timezone: "Europe/Berlin"
        }
    );

    // Add portfolio summary scheduler (needs special handling for the chart)
    cron.schedule(
        "0 9 * * *", // Runs every day at 9AM
        async () => {
            for (const chatId of [adamChatId]) {
                await sendPortfolioSummary(bot, sendMarkdownMessage, chatId);
            }
        },
        {
            timezone: "Europe/Berlin"
        }
    );

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
