import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { databaseService } from "./database";

interface InlineKeyboardButton {
    text: string;
    callback_data: string;
}

interface MessageResponse {
    text: string;
    buttons?: {
        inline_keyboard: InlineKeyboardButton[][];
    };
}

type CallbackQueryHandler = (query: any, bot: any) => Promise<void>;

const callbackQueryHandlers: { pattern: RegExp; handler: CallbackQueryHandler; description: string }[] = [];

export function registerCallbackQueryHandler(pattern: RegExp, handler: CallbackQueryHandler, description: string) {
    callbackQueryHandlers.push({ pattern, handler, description });
}

interface TrelloConfig {
    apiKey: string;
    token: string;
    boardId: string;
}

interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    due: string | null;
    dueComplete: boolean;
    idList: string;
}

interface TrelloList {
    id: string;
    name: string;
}

export class TrelloService {
    private readonly baseUrl = "https://api.trello.com/1";
    private readonly auth: { key: string; token: string };
    private readonly boardId: string;
    private todoListId: string | null = null;

    constructor(config: TrelloConfig) {
        this.auth = {
            key: config.apiKey,
            token: config.token
        };
        this.boardId = config.boardId;
    }

    setTodoListId(listId: string) {
        this.todoListId = listId;
    }

    getDefaultListId(): string {
        if (!this.todoListId) {
            throw new Error("Trello default list ID is not configured");
        }
        return this.todoListId;
    }

    /**
     * Create a new card in Trello
     */
    async createCard(listId: string, title: string, description?: string, dueDate?: Date): Promise<TrelloCard> {
        try {
            const response = await axios.post(`${this.baseUrl}/cards`, {
                idList: listId,
                name: title,
                desc: description || "",
                due: dueDate?.toISOString(),
                ...this.auth
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to create Trello card:", error);
            throw new Error("Failed to create card in Trello");
        }
    }

    /**
     * Get all lists on the board
     */
    async getLists(): Promise<TrelloList[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/boards/${this.boardId}/lists`, {
                params: this.auth
            });

            return response.data;
        } catch (error) {
            if (error instanceof Error) {
                logger.error("Failed to fetch Trello lists:", error.message);
            } else {
                logger.error("Failed to fetch Trello lists:", error);
            }
            throw new Error("Failed to fetch lists from Trello");
        }
    }

    /**
     * Get cards from a specific list
     */
    async getCardsInList(listId: string): Promise<TrelloCard[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/lists/${listId}/cards`, {
                params: this.auth
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to fetch cards from list:", error);
            throw new Error("Failed to fetch cards from Trello list");
        }
    }

    /**
     * Update a card's status (move to different list)
     */
    async moveCard(cardId: string, newListId: string): Promise<TrelloCard> {
        try {
            const response = await axios.put(`${this.baseUrl}/cards/${cardId}`, {
                idList: newListId,
                ...this.auth
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to move Trello card:", error);
            throw new Error("Failed to move card in Trello");
        }
    }

    /**
     * Mark a card as complete/incomplete
     */
    async updateCardCompletion(cardId: string, isComplete: boolean): Promise<TrelloCard> {
        try {
            const ANSWERED_LABEL_ID = "6781b6bc228d4321daaef291";

            const response = await axios.put(`${this.baseUrl}/cards/${cardId}`, {
                dueComplete: isComplete,
                idLabels: isComplete ? [ANSWERED_LABEL_ID] : [],
                ...this.auth
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to update card completion status:", error);
            throw new Error("Failed to update card completion status");
        }
    }

    /**
     * Get all cards due within a specific timeframe
     */
    async getUpcomingCards(): Promise<TrelloCard[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/boards/${this.boardId}/cards`, {
                params: {
                    ...this.auth,
                    due: "next"
                }
            });

            return response.data;
        } catch (error) {
            logger.error("Failed to fetch upcoming cards:", error);
            throw new Error("Failed to fetch upcoming cards");
        }
    }

    async getBoardLabels(): Promise<Array<{ id: string; name: string; color: string }>> {
        try {
            const response = await axios.get(`${this.baseUrl}/boards/${this.boardId}/labels`, {
                params: this.auth
            });
            return response.data;
        } catch (error) {
            logger.error("Failed to fetch board labels:", error);
            throw new Error("Failed to fetch board labels");
        }
    }

    /**
     * Delete a card
     */
    async deleteCard(cardId: string): Promise<void> {
        try {
            await axios.delete(`${this.baseUrl}/cards/${cardId}`, {
                params: this.auth
            });
        } catch (error) {
            logger.error("Failed to delete Trello card:", error);
            throw new Error("Failed to delete card from Trello");
        }
    }
}

export function initTrelloService() {
    const trelloService = new TrelloService({
        apiKey: env.TRELLO_API_KEY,
        token: env.TRELLO_TOKEN,
        boardId: env.TRELLO_BOARD_ID
    });

    if (env.TRELLO_DEFAULT_LIST_ID) {
        trelloService.setTodoListId(env.TRELLO_DEFAULT_LIST_ID);
    }

    // Register callback query handlers for Trello actions
    registerCallbackQueryHandler(
        /^remove_task:(.+)$/,
        async (query, bot) => {
            try {
                const taskId = query.data?.split(":")[1];
                if (!taskId) {
                    await bot.answerCallbackQuery(query.id, { text: "Invalid task ID" });
                    return;
                }

                await trelloService.deleteCard(taskId);

                // Answer the callback query
                await bot.answerCallbackQuery(query.id, {
                    text: "Task removed successfully!"
                });

                // Update the message to show the task was deleted
                if (query.message && query.message.text) {
                    // Preserve the original message and append status
                    const originalText = query.message.text;
                    const updatedText = `${originalText}\n\n_✅ Task deleted successfully_`;

                    await bot.editMessageText(updatedText, {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        parse_mode: "Markdown"
                    });
                }
            } catch (error) {
                logger.error("Error handling remove_task callback:", error);
                await bot.answerCallbackQuery(query.id, {
                    text: "Error removing task. Please try again."
                });
            }
        },
        "Handler for task removal buttons"
    );

    return trelloService;
}
