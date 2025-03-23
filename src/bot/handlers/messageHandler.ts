import { langchainService } from "../../services/langchain";
import { logger } from "../../utils/logger";
import TelegramBot from "node-telegram-bot-api";
import { isFinishedResponse, TgReadyToolResponse, SingleMessageResponse } from "./messageHandlers";

export async function handleMessage(message: TelegramBot.Message, bot: TelegramBot): Promise<TgReadyToolResponse> {
    if (!message.text) {
        return { text: "Please send a text message." };
    }

    try {
        // Use LangChain service to parse intent using the message text
        const { intent, intentDescription, parameters } = await langchainService.parseIntent(message.text);

        // Execute the handler for this intent, passing the full message object
        const result = await langchainService.handleIntent(intent, parameters);

        if (isFinishedResponse(result)) {
            return result;
        }

        // Generate a user-friendly response
        const response = await langchainService.generateResponse(intent, parameters, { result });
        return { text: response };
    } catch (error) {
        logger.error("Error handling message:", error);
        return { text: "Sorry, I couldn't process your request. Please try again." };
    }
}
