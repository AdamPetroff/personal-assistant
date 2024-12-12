import OpenAI from "openai";
import { logger } from "../utils/logger";
import { env } from "../config/constants";

export class OpenAIService {
    private client: OpenAI;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required");
        }

        this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }

    async parseIntent(userMessage: string): Promise<{
        intent: string;
        parameters: Record<string, any>;
    }> {
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 1024,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "create_task",
                            description: "Create a new task with optional due date",
                            parameters: {
                                type: "object",
                                properties: {
                                    title: {
                                        type: "string",
                                        description: "The title of the task"
                                    },
                                    description: {
                                        type: "string",
                                        description: "A detailed description of the task"
                                    },
                                    dueDate: {
                                        type: "string",
                                        description: "Optional ISO date string for when the task is due",
                                        format: "date-time"
                                    }
                                },
                                required: ["title"]
                            }
                        }
                    },
                    {
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
                        }
                    },
                    {
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
                        }
                    }
                ],
                messages: [
                    {
                        role: "system",
                        content: `You are a personal task management assistant. Parse user messages to determine their intent:
                        - If they want to create a task, use create_task
                        - If they want to set a reminder, use create_reminder
                        - If they want to query their schedule/tasks/reminders, use query_items
                        Extract relevant dates, times, and descriptions from their message.
                        Respond with a single tool call that best matches their intent.`
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ]
            });

            const toolCall = response.choices[0]?.message?.tool_calls?.[0];
            if (!toolCall) {
                throw new Error("No tool call received from OpenAI");
            }

            return {
                intent: toolCall.function.name,
                parameters: JSON.parse(toolCall.function.arguments)
            };
        } catch (error) {
            logger.error("Error parsing intent with OpenAI:", error);
            throw new Error("Failed to parse intent");
        }
    }

    async generateResponse(
        intent: string,
        parameters: Record<string, any>,
        context?: Record<string, any>
    ): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4-turbo-preview",
                max_tokens: 1024,
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful task management assistant. 
                        Generate natural, friendly responses based on the intent and parameters provided.
                        Keep responses concise and action-oriented.`
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            intent,
                            parameters,
                            context
                        })
                    }
                ]
            });

            return response.choices[0]?.message?.content || "";
        } catch (error) {
            logger.error("Error generating response with OpenAI:", error);
            throw new Error("Failed to generate response");
        }
    }
}

export const openaiService = new OpenAIService();
