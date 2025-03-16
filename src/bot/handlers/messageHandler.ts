import { langchainService } from "../../services/langchain";
import { logger } from "../../utils/logger";
import TelegramBot from "node-telegram-bot-api";

export async function handleMessage(message: TelegramBot.Message) {
    if (!message.text) {
        return "Please send a text message.";
    }

    try {
        // Use LangChain service to parse intent using the message text
        const { intent, intentDescription, parameters } = await langchainService.parseIntent(message.text);

        // Execute the handler for this intent, passing the full message object
        const result = await langchainService.handleIntent(intent, parameters);

        // Generate a user-friendly response
        const response = await langchainService.generateResponse(intent, parameters, { result });
        return response;
    } catch (error) {
        logger.error("Error handling message:", error);
        return "Sorry, I couldn't process your request. Please try again.";
    }
}
