import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { databaseService } from "./database";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const interestsListId = "6781af478a024f11a93b752d";

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

    // trelloService.getBoardLabels().then((lists) => {
    //     console.log(lists);
    // });

    // Define the list IDs

    // Create LangChain tools
    const createTaskTool = tool(
        async ({ title, description, dueDate }) => {
            return trelloService.createCard(todoListId, title, description, dueDate ? new Date(dueDate) : undefined);
        },
        {
            name: "create_task",
            description: "Create a new task or todo item with optional due date. Use when the user wants to add a task or todo.",
            schema: z.object({
                title: z.string().describe("The title of the task"),
                description: z.string().optional().describe("A detailed description of the task"),
                dueDate: z.string().optional().describe("Optional ISO date string for when the task is due")
            })
        }
    );


    const completeTaskTool = tool(
        async ({ taskId }) => {
            return trelloService.updateCardCompletion(taskId, true);
        },
        {
            name: "complete_task",
            description: "Mark a task or todo item as complete. Use when the user wants to mark a task as done or finished.",
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

    const trackInterestTool = tool(
        async ({ topic, description }) => {
            await trelloService.createCard(interestsListId, topic, description);
            return {
                success: true,
                message: "Interest added successfully. User will be notified with the details about the topic soon."
            };
        },
        {
            name: "track_interest_in_topic",
            description: "Use when the user expresses curiosity or interest in learning more about a topic or subject",
            schema: z.object({
                topic: z.string().describe("The topic or interest to track"),
                description: z.string().optional().describe("Additional details or context about the interest")
            })
        }
    );

    const getInterestsTool = tool(
        async () => {
            return trelloService.getCardsInList(interestsListId);
        },
        {
            name: "get_interests",
            description: "Retrieve all tracked interests",
            schema: z.object({})
        }
    );

    // Create a tool for listing todos/tasks
    const listTodosTool = tool(
        async () => {
            const cards = await trelloService.getCardsInList(todoListId);
            return {
                success: true,
                tasks: cards.map(card => ({
                    id: card.id,
                    title: card.name,
                    description: card.desc,
                    dueDate: card.due,
                    completed: card.dueComplete
                }))
            };
        },
        {
            name: "list_todos",
            description: "Retrieve all todo items or tasks from the user's todo list",
            schema: z.object({})
        }
    );

    // Register all tools with LangChain service
    langchainService.registerTools([
        createTaskTool,
        completeTaskTool,
        deleteTaskTool,
        trackInterestTool,
        getInterestsTool,
        listTodosTool
    ]);

    return trelloService;
}
