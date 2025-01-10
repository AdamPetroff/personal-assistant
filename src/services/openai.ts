import OpenAI from "openai";
import { logger } from "../utils/logger";
import { env } from "../config/constants";

export type IntentHandler = (parameters: Record<string, any>) => Promise<any>;

export type ToolRegistration = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required: string[];
        };
    };
    handler: IntentHandler;
};

export class OpenAIService {
    private client: OpenAI;
    private tools: ToolRegistration[] = [];
    private handlers: Map<string, IntentHandler> = new Map();

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required");
        }

        this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }

    registerTool(tool: ToolRegistration) {
        this.tools.push(tool);
        this.handlers.set(tool.function.name, tool.handler);
        return this;
    }

    async handleIntent(intent: string, parameters: Record<string, any>): Promise<any> {
        const handler = this.handlers.get(intent);
        if (!handler) {
            throw new Error(`No handler registered for intent: ${intent}`);
        }
        return handler(parameters);
    }

    async parseIntent(userMessage: string): Promise<{
        intent: string;
        parameters: Record<string, any>;
        intentDescription: string;
    }> {
        try {
            console.log(this.tools.map((tool) => tool.function.name));
            const response = await this.client.chat.completions.create({
                model: "gpt-4o",
                max_tokens: 1024,
                tools: this.tools,
                messages: [
                    {
                        role: "system",
                        content: `You are a personal task management assistant. Parse user messages to determine their intent:
                        ${this.tools.map((tool) => `- If they want to ${tool.function.description}, use ${tool.function.name}`).join("\n")}
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

            const tool = this.tools.find((tool) => tool.function.name === toolCall.function.name);

            return {
                intent: toolCall.function.name,
                intentDescription: tool?.function.description || toolCall.function.name,
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
                model: "gpt-4o-mini",
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
