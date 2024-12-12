import { openaiService } from "../../services/openai";
// import { claudeService } from "../../services/claude";
import { trelloService } from "../../services/trello";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";

export async function handleMessage(message: string) {
    if (!message) {
        return "Please send a text message";
    }

    try {
        // Use OpenAI service to parse intent
        const { intent, parameters } = await openaiService.parseIntent(message);

        const listId = "675a0dd51091fad3e2ebdcf1";

        // Execute the corresponding action in Trello
        let result;
        switch (intent) {
            case "create_task":
                result = await trelloService.createCard(
                    listId,
                    parameters.title,
                    parameters.description,
                    parameters.dueDate
                );
                break;
            case "create_reminder":
                // result = await trelloService.createReminder(parameters.title, parameters.reminderTime);
                break;
            case "query_items":
                result = await trelloService.getCardsInList(listId);
                break;
            default:
                throw new Error(`Unknown intent: ${intent}`);
        }

        // Generate a user-friendly response
        const response = await openaiService.generateResponse(intent, parameters, { result });
        return response;
    } catch (error) {
        logger.error("Error handling message:", error);
        return "Sorry, I couldn't process your request. Please try again.";
    }
}
