import { handleMessage } from "./messageHandler";
import { handleReply } from "./replyHandler";
import { logger } from "../../utils/logger";
import { conversationContextService } from "../../services/conversationContext";
import TelegramBot from "node-telegram-bot-api";

/**
 * Enhanced version of sendMarkdownMessage that also stores the message in conversation context
 */
const createSendAndTrackMarkdownMessage = (
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) => {
    return async (chatId: number | string, text: string, options: any = {}, originalMessageId?: number) => {
        try {
            const sentMessage = await sendMarkdownMessage(chatId, text, options);

            // If this is part of a conversation, store it in the conversation context
            if (originalMessageId) {
                // Get the bot's ID first, then add the message
                const botInfo = await bot.getMe();
                conversationContextService.addMessage(
                    originalMessageId,
                    sentMessage.message_id,
                    botInfo.id,
                    true,
                    text
                );
            }

            return sentMessage;
        } catch (error) {
            logger.error("Error sending and tracking message:", error);
            throw error;
        }
    };
};

/**
 * Set up message handling for the bot
 */
export function setupMessageHandlers(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) {
    const sendAndTrackMarkdownMessage = createSendAndTrackMarkdownMessage(bot, sendMarkdownMessage);

    // Handle all incoming messages
    bot.on("message", async (msg) => {
        try {
            // Skip if it's a file upload or command (these are handled elsewhere)
            if (
                !msg.text ||
                msg.document ||
                msg.photo ||
                msg.audio ||
                msg.video ||
                msg.voice ||
                (msg.text && msg.text.startsWith("/"))
            ) {
                return;
            }

            // Check if this is a reply to a message
            if (msg.reply_to_message) {
                const fromId = msg.from?.id || 0;
                logger.info(`Received reply to message ${msg.reply_to_message.message_id} from ${fromId}`);

                // Process the reply
                const { response, threadId } = await handleReply(
                    msg.reply_to_message.message_id,
                    msg.text || "",
                    fromId
                );

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

                const response = await handleMessage(msg);

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
}
