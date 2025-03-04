import { openaiService } from "../../services/openai";
import { logger } from "../../utils/logger";

export async function handleMessage(message: string) {
    if (!message) {
        return "Please send a text message.";
    }

    try {
        // Use OpenAI service to parse intent
        const { intent, intentDescription, parameters } = await openaiService.parseIntent(message);

        // Execute the handler for this intent
        const result = await openaiService.handleIntent(intent, parameters);

        // Generate a user-friendly response
        const response = await openaiService.generateResponse(intentDescription, parameters, { result });
        return response;
    } catch (error) {
        logger.error("Error handling message:", error);
        return "Sorry, I couldn't process your request. Please try again.";
    }
}
