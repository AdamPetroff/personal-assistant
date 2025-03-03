import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { openaiService } from "./openai";
import { databaseService } from "./database";

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

export function initTrelloService() {
    const trelloService = new TrelloService({
        apiKey: env.TRELLO_API_KEY,
        token: env.TRELLO_TOKEN,
        boardId: env.TRELLO_BOARD_ID
    });

    // trelloService.getBoardLabels().then((lists) => {
    //     console.log(lists);
    // });

    openaiService
        .registerTool({
            type: "function",
            function: {
                name: "create_task",
                description: "Create a new task with optional due date",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "The title of the task" },
                        description: { type: "string", description: "A detailed description of the task" },
                        dueDate: {
                            type: "string",
                            description: "Optional ISO date string for when the task is due",
                            format: "date-time"
                        }
                    },
                    required: ["title"]
                }
            },
            handler: async (parameters) => {
                const listId = "675a0dd51091fad3e2ebdcf1"; // TODO: Make this configurable
                return trelloService.createCard(
                    listId,
                    parameters.title,
                    parameters.description,
                    parameters.dueDate ? new Date(parameters.dueDate) : undefined
                );
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "create_reminder",
                description: "Set a reminder for a specific date and time",
                parameters: {
                    type: "object",
                    properties: {
                        title: {
                            type: "string",
                            description: "What to be reminded about"
                        },
                        reminderTime: {
                            type: "string",
                            description: "ISO date-time string for when to send the reminder",
                            format: "date-time"
                        }
                    },
                    required: ["title", "reminderTime"]
                }
            },
            handler: async (parameters) => {
                return databaseService.createReminder(parameters.title, new Date(parameters.reminderTime));
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "query_items",
                description: "Query upcoming tasks and reminders",
                parameters: {
                    type: "object",
                    properties: {
                        date: {
                            type: "string",
                            description: "Optional ISO date string to query items for a specific date",
                            format: "date"
                        },
                        type: {
                            type: "string",
                            enum: ["all", "tasks", "reminders"],
                            description: "Type of items to query"
                        }
                    },
                    required: ["type"]
                }
            },
            handler: async (parameters) => {
                const cards = await databaseService.getTasks();

                // Filter cards based on type and date if provided
                const tasks = cards.filter((card) => {
                    if (parameters.date && card.dueDate) {
                        const cardDate = card.dueDate.toISOString().split("T")[0];
                        if (cardDate !== parameters.date) {
                            return false;
                        }
                    }

                    if (parameters.type === "all") return true;

                    // Assuming cards in the reminders list are reminders
                    return parameters.type === "reminders" ? false : false;
                });

                const reminders = await databaseService.getReminders(false);

                const filteredReminders = reminders.filter((reminder) => {
                    if (parameters.date && reminder.reminderTime) {
                        const reminderDate = reminder.reminderTime.toISOString().split("T")[0];
                        if (reminderDate !== parameters.date) {
                            return false;
                        }
                    }
                    return true;
                });

                return [...tasks, ...filteredReminders];
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "complete_task",
                description: "Mark a task as complete",
                parameters: {
                    type: "object",
                    properties: {
                        taskId: {
                            type: "string",
                            description: "The ID of the task to mark as complete"
                        }
                    },
                    required: ["taskId"]
                }
            },
            handler: async (parameters) => {
                return trelloService.updateCardCompletion(parameters.taskId, true);
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "delete_task",
                description: "Delete a task",
                parameters: {
                    type: "object",
                    properties: {
                        taskId: {
                            type: "string",
                            description: "The ID of the task to delete"
                        }
                    },
                    required: ["taskId"]
                }
            },
            handler: async (parameters) => {
                await trelloService.deleteCard(parameters.taskId);
                return { success: true, message: "Task deleted successfully" };
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "track_interest_in_topic",
                description:
                    "Use when the user expresses curiosity or interest in learning more about a topic or subject",
                parameters: {
                    type: "object",
                    properties: {
                        topic: {
                            type: "string",
                            description: "The topic or interest to track"
                        },
                        description: {
                            type: "string",
                            description: "Additional details or context about the interest"
                        }
                    },
                    required: ["topic"]
                }
            },
            handler: async (parameters) => {
                await trelloService.createCard(interestsListId, parameters.topic, parameters.description);
                return {
                    success: true,
                    message: "Interest added successfully. User will be notified with the details about the topic soon."
                };
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "get_interests",
                description: "Retrieve all tracked interests",
                parameters: {
                    type: "object",
                    properties: {}
                }
            },
            handler: async () => {
                return trelloService.getCardsInList(interestsListId);
            }
        })
        .registerTool({
            type: "function",
            function: {
                name: "remove_interest",
                description: "Remove a tracked interest",
                parameters: {
                    type: "object",
                    properties: {
                        interestId: {
                            type: "string",
                            description: "The ID of the interest to remove"
                        }
                    },
                    required: ["interestId"]
                }
            },
            handler: async (parameters) => {
                await trelloService.deleteCard(parameters.interestId);
                return { success: true, message: "Interest removed successfully" };
            }
        });

    return trelloService;
}
