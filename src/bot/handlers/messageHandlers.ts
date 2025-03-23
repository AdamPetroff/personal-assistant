import { handleMessage } from "./messageHandler";
import { handleReply } from "./replyHandler";
import { logger } from "../../utils/logger";
import { conversationContextService } from "../../services/conversationContext";
import TelegramBot from "node-telegram-bot-api";
import { z } from "zod";

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

// Define the shape of a single button
const inlineKeyboardButtonSchema = z.object({
    text: z.string(),
    callback_data: z.string(),
    url: z.string().optional(),
    web_app: z.object({ url: z.string() }).optional(),
    login_url: z.object({ url: z.string() }).optional(),
    switch_inline_query: z.string().optional(),
    switch_inline_query_current_chat: z.string().optional(),
    callback_game: z.any().optional(),
    pay: z.boolean().optional()
});

// Define the shape of the inline keyboard
const inlineKeyboardMarkupSchema = z.object({
    inline_keyboard: z.array(z.array(inlineKeyboardButtonSchema))
});

const singleMessageSchema = z.object({
    text: z.string(),
    image: z.instanceof(Buffer).optional(),
    buttons: inlineKeyboardMarkupSchema.optional()
});

// Support either a single message object or an array of message objects
const tgReadyToolResponse = z.union([singleMessageSchema, z.array(singleMessageSchema)]);

export type SingleMessageResponse = z.infer<typeof singleMessageSchema>;
export type TgReadyToolResponse = z.infer<typeof tgReadyToolResponse>;

export function isFinishedResponse(response: any) {
    return tgReadyToolResponse.safeParse(response).success;
}

/**
 * Sends a single message response
 */
async function sendSingleResponse(
    bot: TelegramBot,
    chatId: number | string,
    response: SingleMessageResponse,
    replyToMessageId?: number,
    sendMarkdownMessage?: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
): Promise<TelegramBot.Message> {
    if (response.image) {
        return await bot.sendPhoto(chatId, response.image, {
            caption: response.text,
            parse_mode: "Markdown",
            ...(replyToMessageId && { reply_to_message_id: replyToMessageId }),
            ...(response.buttons && { reply_markup: response.buttons })
        });
    } else {
        const options = {
            ...(replyToMessageId && { reply_to_message_id: replyToMessageId }),
            ...(response.buttons && { reply_markup: response.buttons })
        };

        if (sendMarkdownMessage) {
            return await sendMarkdownMessage(chatId, response.text, options);
        } else {
            return await bot.sendMessage(chatId, response.text, {
                parse_mode: "Markdown",
                ...options
            });
        }
    }
}

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

                // Handle the response based on its type
                if (typeof response === "string") {
                    // It's a simple text response
                    await sendAndTrackMarkdownMessage(
                        msg.chat.id,
                        response,
                        { reply_to_message_id: msg.message_id },
                        threadId
                    );
                } else {
                    const botInfo = await bot.getMe();
                    const responses = Array.isArray(response) ? response : [response];

                    // Send each response in the array
                    for (const [index, item] of responses.entries()) {
                        // Only reply to the original message for the first response
                        const replyId = index === 0 ? msg.message_id : undefined;

                        const sentMessage = await sendSingleResponse(
                            bot,
                            msg.chat.id,
                            item,
                            replyId,
                            sendMarkdownMessage
                        );

                        // Update the conversation context with this response
                        conversationContextService.addMessage(
                            threadId,
                            sentMessage.message_id,
                            botInfo.id,
                            true,
                            item.text
                        );
                    }
                }
            } else {
                // Process the user's message as a regular message
                const fromId = msg.from?.id || 0;
                logger.info(`Received message from ${fromId}: ${msg.text}`);

                const response = await handleMessage(msg, bot);
                const botInfo = await bot.getMe();

                const responses = Array.isArray(response) ? response : [response];
                let firstSentMessage: TelegramBot.Message | null = null;

                // Send each response in the array
                for (const [index, item] of responses.entries()) {
                    const sentMessage = await sendSingleResponse(
                        bot,
                        msg.chat.id,
                        item,
                        undefined,
                        sendMarkdownMessage
                    );

                    // Store the first message to use as thread ID
                    if (index === 0) {
                        firstSentMessage = sentMessage;
                    }

                    // Store the bot's response in the conversation context
                    conversationContextService.addMessage(
                        firstSentMessage!.message_id, // Original message ID (conversation thread ID)
                        sentMessage.message_id, // Message ID
                        botInfo.id, // Bot ID
                        true, // Is bot
                        item.text // Message text
                    );
                }

                // Store the user's message in the conversation context
                if (firstSentMessage) {
                    conversationContextService.addMessage(
                        firstSentMessage.message_id, // Original message ID (conversation thread ID)
                        msg.message_id, // Message ID
                        fromId, // User ID
                        false, // Not a bot
                        msg.text || "" // Message text
                    );
                }
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
