# Responding to Messages

## Description

I want to be able to respond to messages from the bot. The bot should be able to respond back to my replies, keeping the conversation going in replies. For example, if bot sends me a Daily leading message, I should be able to ask questions about it, and the bot would then answer my questions.
The conversation should continue only in replies, not in the main message. Sending a non reply message will let the bot resume its normal behavior.

## Analysis

1. **Current Message Handling**:

    - The bot currently processes messages using the `handleMessage` function in `src/bot/handlers/messageHandler.ts`.
    - Messages are processed through the OpenAI service to parse intent, handle the intent, and generate a response.
    - The bot only handles direct messages and doesn't have special handling for replies.

2. **Telegram Bot API Capabilities**:

    - The Telegram Bot API provides information about replies in the message object.
    - When a user replies to a message, the message object contains a `reply_to_message` property with details about the original message.

3. **Conversation Context**:

    - Currently, there's no mechanism to maintain conversation context between messages.
    - To implement a conversational flow in replies, we need to track the conversation history.

4. **Required Changes**:
    - Modify the message handler to detect when a message is a reply to a bot message.
    - Implement a conversation context mechanism to maintain the history of messages in a reply thread.
    - Create a new handler for reply messages that uses the conversation context to generate contextual responses.
    - Update the bot's message event handler to route messages appropriately based on whether they are replies or direct messages.

## Implementation Plan

1. **Create a Conversation Context Service**:

    - Implement a service to store and retrieve conversation history.
    - Use a data structure that maps message IDs to conversation threads.
    - Include functionality to clean up old conversations to prevent memory leaks.

2. **Update Message Handler**:

    - Modify the message event handler to check if a message is a reply.
    - Route reply messages to a new handler specifically for replies.
    - Keep the existing handler for direct messages.

3. **Implement Reply Handler**:

    - Create a new handler function for reply messages.
    - Retrieve the conversation context based on the original message ID.
    - Use OpenAI to generate a contextual response based on the conversation history.
    - Update the conversation context with the new message and response.

4. **Update Bot Message Sending**:

    - Modify the message sending function to store the sent message ID.
    - Associate the message ID with the conversation context.

5. **Test and Refine**:

    - Test the implementation with various scenarios.
    - Refine the conversation context management based on testing results.

6. **Add Cleanup Mechanism**:
    - Implement a scheduled task to clean up old conversation contexts.
    - Set an appropriate TTL for conversation contexts.

## Implementation Summary

The feature has been successfully implemented with the following components:

1. **Conversation Context Service** (`src/services/conversationContext.ts`):

    - Created a service to store and manage conversation history
    - Implemented methods to add messages to conversations, retrieve conversation history
    - Added automatic cleanup of old conversations to prevent memory leaks

2. **Reply Handler** (`src/bot/handlers/replyHandler.ts`):

    - Implemented a handler specifically for reply messages
    - Uses conversation history to provide context for generating responses
    - Maintains conversation state across multiple replies

3. **OpenAI Service Enhancement** (`src/services/openai.ts`):

    - Added a new method `generateConversationalResponse` to handle conversational interactions
    - Uses conversation history to generate contextually relevant responses
    - Maintains the same formatting standards as other responses

4. **Bot Message Handling** (`src/bot/index.ts`):
    - Updated to detect when a message is a reply
    - Routes replies to the new reply handler
    - Tracks sent messages to maintain conversation context
    - Preserves existing behavior for non-reply messages
    - **Bug Fix**: Updated to store both scheduled messages and regular responses in the conversation context to ensure the bot has memory of its previous messages when users reply
    - **Bug Fix**: Enhanced to maintain the same conversation thread for nested replies (replies to replies), allowing for continuous conversations

The implementation allows users to have contextual conversations with the bot by replying to its messages. The bot will remember the conversation history and provide relevant responses based on the context, even for nested replies (replies to the bot's replies). Regular (non-reply) messages continue to be handled as before, allowing the bot to resume its normal behavior when not in a conversation.
