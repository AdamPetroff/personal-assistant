import { logger } from "../../utils/logger";
import { conversationContextService } from "../../services/conversationContext";
import { langchainService } from "../../services/langchain";
import { TgReadyToolResponse, SingleMessageResponse } from "./messageHandlers";

/**
 * Handle a reply to a bot message
 * @param replyToMessageId The ID of the message being replied to
 * @param messageText The text of the reply
 * @param userId The ID of the user sending the reply
 * @returns The bot's response to the reply and the original thread ID
 */
export async function handleReply(
    replyToMessageId: number,
    messageText: string,
    userId: number
): Promise<{ response: string | TgReadyToolResponse; threadId: number }> {
    if (!messageText) {
        return { response: "Please send a text message", threadId: replyToMessageId };
    }

    try {
        // First, check if the message being replied to is part of an existing conversation
        // If it is, we should use that conversation's thread ID instead of the direct reply ID
        let threadId = replyToMessageId;
        let existingThread = conversationContextService.getConversation(replyToMessageId);

        // If no direct thread found, check if this message ID exists in any thread
        if (!existingThread || existingThread.messages.length === 0) {
            // Search for this message ID in all threads
            const threadIdForMessage = conversationContextService.findThreadIdForMessage(replyToMessageId);
            if (threadIdForMessage) {
                threadId = threadIdForMessage;
                existingThread = conversationContextService.getConversation(threadId);
                logger.info(`Found message ${replyToMessageId} in existing thread ${threadId}`);
            }
        }

        // Get the conversation history using the determined thread ID
        const conversationHistory = conversationContextService.getConversationHistory(threadId);

        // If there's no conversation history, treat it as a new message
        if (conversationHistory.length === 0) {
            logger.info(`No conversation history found for message ${replyToMessageId}, treating as new message`);
            // Add the user's message to start a new conversation
            conversationContextService.addMessage(threadId, replyToMessageId, userId, false, messageText);
        }

        // Generate a response based on the conversation history
        // This returns a string, as per its implementation
        const responseText = await langchainService.generateConversationalResponse(messageText, conversationHistory);

        // Add the user's message to the conversation context
        conversationContextService.addMessage(threadId, Date.now(), userId, false, messageText);

        // Store the bot's response in the conversation
        conversationContextService.addMessage(threadId, Date.now() + 1, 0, true, responseText);

        // Return the response as a string (default behavior)
        return { response: responseText, threadId };
    } catch (error) {
        logger.error("Error handling reply:", error);
        return {
            response: "Sorry, I couldn't process your reply. Please try again.",
            threadId: replyToMessageId
        };
    }
}
