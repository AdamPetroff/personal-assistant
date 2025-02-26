import { logger } from "../utils/logger";

/**
 * Interface for a message in a conversation
 */
interface ConversationMessage {
    id: number;
    from: {
        id: number;
        isBot: boolean;
    };
    text: string;
    timestamp: number;
}

/**
 * Interface for a conversation thread
 */
interface ConversationThread {
    messages: ConversationMessage[];
    lastUpdated: number;
}

/**
 * Class to manage conversation contexts
 */
export class ConversationContextService {
    private conversations: Map<number, ConversationThread> = new Map();
    private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL for conversations
    private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Clean up every hour

    constructor() {
        // Set up periodic cleanup
        setInterval(() => this.cleanupOldConversations(), this.CLEANUP_INTERVAL_MS);
        logger.info("ConversationContextService initialized");
    }

    /**
     * Add a message to a conversation thread
     * @param originalMessageId The ID of the original message in the thread
     * @param messageId The ID of the current message
     * @param fromId The ID of the sender
     * @param isBot Whether the sender is a bot
     * @param text The message text
     */
    addMessage(originalMessageId: number, messageId: number, fromId: number, isBot: boolean, text: string): void {
        // Get or create the conversation thread
        let thread = this.conversations.get(originalMessageId);
        if (!thread) {
            thread = {
                messages: [],
                lastUpdated: Date.now()
            };
            this.conversations.set(originalMessageId, thread);
        }

        // Add the message to the thread
        thread.messages.push({
            id: messageId,
            from: {
                id: fromId,
                isBot
            },
            text,
            timestamp: Date.now()
        });

        // Update the last updated timestamp
        thread.lastUpdated = Date.now();
    }

    /**
     * Get the conversation thread for a message
     * @param originalMessageId The ID of the original message in the thread
     * @returns The conversation thread or undefined if not found
     */
    getConversation(originalMessageId: number): ConversationThread | undefined {
        return this.conversations.get(originalMessageId);
    }

    /**
     * Get the conversation history as an array of messages in the format expected by OpenAI
     * @param originalMessageId The ID of the original message in the thread
     * @returns Array of messages in the format expected by OpenAI
     */
    getConversationHistory(originalMessageId: number): Array<{ role: string; content: string }> {
        const thread = this.conversations.get(originalMessageId);
        if (!thread) {
            return [];
        }

        // Convert the messages to the format expected by OpenAI
        return thread.messages.map((message) => ({
            role: message.from.isBot ? "assistant" : "user",
            content: message.text
        }));
    }

    /**
     * Clean up old conversations to prevent memory leaks
     */
    private cleanupOldConversations(): void {
        const now = Date.now();
        let cleanupCount = 0;

        for (const [key, thread] of this.conversations.entries()) {
            if (now - thread.lastUpdated > this.TTL_MS) {
                this.conversations.delete(key);
                cleanupCount++;
            }
        }

        if (cleanupCount > 0) {
            logger.info(`Cleaned up ${cleanupCount} old conversations`);
        }
    }

    /**
     * Find the thread ID (original message ID) for a message
     * @param messageId The ID of the message to find
     * @returns The thread ID if found, undefined otherwise
     */
    findThreadIdForMessage(messageId: number): number | undefined {
        // Iterate through all conversations to find the message
        for (const [threadId, thread] of this.conversations.entries()) {
            // Check if the message exists in this thread
            const messageExists = thread.messages.some((message) => message.id === messageId);
            if (messageExists) {
                return threadId;
            }
        }
        return undefined;
    }
}

// Export a singleton instance
export const conversationContextService = new ConversationContextService();
