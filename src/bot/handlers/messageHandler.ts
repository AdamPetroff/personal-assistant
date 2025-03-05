import { langchainService } from "../../services/langchain";
import { logger } from "../../utils/logger";

export async function handleMessage(message: string) {
    if (!message) {
        return "Please send a text message.";
    }

    try {
        // Use LangChain service to parse intent
        const { intent, intentDescription, parameters } = await langchainService.parseIntent(message);

        // Execute the handler for this intent
        const result = await langchainService.handleIntent(intent, parameters);

        // Generate a user-friendly response
        const response = await langchainService.generateResponse(intent, parameters, { result });
        return response;
    } catch (error) {
        logger.error("Error handling message:", error);
        return "Sorry, I couldn't process your request. Please try again.";
    }
}
