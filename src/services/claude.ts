import Client from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import { env } from "../config/constants";

export class ClaudeService {
    private client: Client;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is required");
        }

        this.client = new Client({ apiKey: env.ANTHROPIC_API_KEY });
    }

    async parseIntent(userMessage: string): Promise<{
        intent: string;
        parameters: Record<string, any>;
    }> {
        try {
            const response = await this.client.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                tools: [
                    {
                        name: "create_task",
                        description: "Create a new task with optional due date",
                        input_schema: {
                            type: "object",
                            properties: {
                                title: {
                                    type: "string",
                                    description: "The title/description of the task"
                                },
                                dueDate: {
                                    type: "string",
                                    description: "Optional ISO date string for when the task is due",
                                    format: "date-time"
                                }
                            },
                            required: ["title"]
                        }
                    },
                    {
                        name: "create_reminder",
                        description: "Set a reminder for a specific date and time",
                        input_schema: {
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
                    {
                        name: "query_items",
                        description: "Query upcoming tasks and reminders",
                        input_schema: {
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
                ],
                messages: [
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                system: `You are a personal task management assistant. Parse user messages to determine their intent:
                - If they want to create a task, use create_task
                - If they want to set a reminder, use create_reminder
                - If they want to query their schedule/tasks/reminders, use query_items
                Extract relevant dates, times, and descriptions from their message.
                Respond with a single tool call that best matches their intent.`
            });

            const content = response.content[0];
            if (content.type === "text") {
                const parsedResponse = JSON.parse(content.text);
                return parsedResponse;
            }

            const parsedResponse = JSON.parse(response.content[0].type);
            return parsedResponse;
        } catch (error) {
            logger.error("Error parsing intent with Claude:", error);
            throw new Error("Failed to parse intent");
        }
    }

    async generateResponse(
        intent: string,
        parameters: Record<string, any>,
        context?: Record<string, any>
    ): Promise<string> {
        try {
            const response = await this.client.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: JSON.stringify({
                            intent,
                            parameters,
                            context
                        })
                    }
                ],
                system: `You are a helpful task management assistant. 
                Generate natural, friendly responses based on the intent and parameters provided.
                Keep responses concise and action-oriented.`
            });

            return response.content[0].type === "text" ? response.content[0].text : response.content[0].name;
        } catch (error) {
            logger.error("Error generating response with Claude:", error);
            throw new Error("Failed to generate response");
        }
    }
}

export const claudeService = new ClaudeService();
