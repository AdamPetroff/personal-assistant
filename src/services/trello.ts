import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { databaseService } from "./database";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SingleMessageResponse } from "../bot/handlers/messageHandlers";
import { registerCallbackQueryHandler } from "../bot/handlers/callbackQueryHandlers";

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

    constructor(config: TrelloConfig) {
        this.auth = {
            key: config.apiKey,
            token: config.token
        };
        this.boardId = config.boardId;
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

const todoListId = "675a0dd51091fad3e2ebdcf1"; // TODO: Make this configurable

export function initTrelloService() {
    const trelloService = new TrelloService({
        apiKey: env.TRELLO_API_KEY,
        token: env.TRELLO_TOKEN,
        boardId: env.TRELLO_BOARD_ID
    });

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

    // Create LangChain tools
    const createTaskTool = tool(
        async ({ title, description, dueDate }) => {
            return trelloService.createCard(todoListId, title, description, dueDate ? new Date(dueDate) : undefined);
        },
        {
            name: "create_task",
            description:
                "Create a new task or todo item with optional due date. Use when the user wants to add a task or todo.",
            schema: z.object({
                title: z.string().describe("The title of the task"),
                description: z.string().optional().describe("A detailed description of the task"),
                dueDate: z.string().optional().describe("Optional ISO date string for when the task is due")
            })
        }
    );

    const createMultipleTasksTool = tool(
        async ({ tasks }) => {
            const results = [];
            for (const task of tasks) {
                const result = await trelloService.createCard(
                    todoListId,
                    task.title,
                    task.description,
                    task.dueDate ? new Date(task.dueDate) : undefined
                );
                results.push(result);
            }
            return {
                success: true,
                tasks: results,
                message: `Successfully created ${results.length} tasks: ${results.map((task) => `"${task.name}"`).join(", ")}`
            };
        },
        {
            name: "create_multiple_tasks",
            description:
                "Create multiple tasks or todo items at once. Use when the user wants to add several tasks together.",
            schema: z.object({
                tasks: z
                    .array(
                        z.object({
                            title: z.string().describe("The title of the task"),
                            description: z.string().optional().describe("A detailed description of the task"),
                            dueDate: z.string().optional().describe("Optional ISO date string for when the task is due")
                        })
                    )
                    .describe("An array of tasks to create")
            })
        }
    );

    const completeTaskTool = tool(
        async ({ taskId }) => {
            return trelloService.updateCardCompletion(taskId, true);
        },
        {
            name: "complete_task",
            description:
                "Mark a task or todo item as complete. Use when the user wants to mark a task as done or finished.",
            schema: z.object({
                taskId: z.string().describe("The ID of the task to mark as complete")
            })
        }
    );

    const deleteTaskTool = tool(
        async ({ taskId }) => {
            await trelloService.deleteCard(taskId);
            return { success: true, message: "Task deleted successfully" };
        },
        {
            name: "delete_task",
            description: "Delete a task or todo item. Use when the user wants to remove a task from their list.",
            schema: z.object({
                taskId: z.string().describe("The ID of the task to delete")
            })
        }
    );

    // Create a tool for listing todos/tasks
    const listTodosTool = tool(
        async () => {
            const cards = await trelloService.getCardsInList(todoListId);

            if (cards.length === 0) {
                return {
                    text: "You don't have any tasks in your todo list.",
                    success: true,
                    tasks: []
                };
            }

            // Create a separate message for each task
            const messages: SingleMessageResponse[] = cards.map((card) => {
                // Create delete button for this task
                const inlineKeyboard = [
                    [
                        {
                            text: `🗑️ Remove: ${card.name.substring(0, 30)}${card.name.length > 30 ? "..." : ""}`,
                            callback_data: `remove_task:${card.id}`
                        }
                    ]
                ];

                // Format task details
                const taskText = `*${card.name}*\n${card.desc ? `_Description_: ${card.desc}\n` : ""}${card.due ? `_Due_: ${new Date(card.due).toLocaleDateString()}\n` : ""}${card.dueComplete ? "✅ Completed" : "⏳ Pending"}`;

                return {
                    text: taskText,
                    buttons: {
                        inline_keyboard: inlineKeyboard
                    }
                };
            });

            // Add header message
            messages.unshift({
                text: `*Your Tasks (${cards.length})*\nHere are your current tasks:`
            });

            return messages;
        },
        {
            name: "list_todos",
            description: "Retrieve all todo items or tasks from the user's todo list",
            schema: z.object({})
        }
    );

    // Register all tools with LangChain service (excluding interest tools)
    langchainService.registerTools([
        createTaskTool,
        completeTaskTool,
        deleteTaskTool,
        listTodosTool,
        createMultipleTasksTool
    ]);

    return trelloService;
}
