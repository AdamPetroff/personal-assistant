import OpenAI from "openai";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { exchangeRateService } from "./exchangeRate";

export type IntentHandler = (parameters: Record<string, any>) => Promise<any>;

export type ToolRegistration = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required?: string[];
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
                        Keep responses concise and action-oriented.
                        
                        Format your responses using simple Markdown for better readability:
                        - Use *asterisks* for bold text (important information, headings)
                        - Use _underscores_ for italic text (emphasis)
                        - Use \`backticks\` for code or technical terms
                        - Use bullet points for lists
                        
                        IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.
                        Example: Use "*Heading*" instead of "# Heading"
                        
                        Use only basic Markdown formatting. Do NOT use backslashes to escape characters.`
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

    async getTopicInformation(topic: string, context?: string): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a knowledgeable assistant. Provide a concise but informative overview of the given topic. Include key points, interesting facts, and potential resources for learning more. Keep the response under 300 words.\n\n" +
                            "Format your response using simple Markdown for better readability:\n" +
                            "- Use *asterisks* for bold text (important terms, headings)\n" +
                            "- Use _underscores_ for italic text (emphasis)\n" +
                            "- Use `backticks` for code or technical terms\n" +
                            "- Use bullet points for lists\n\n" +
                            "IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.\n" +
                            'Example: Use "*Heading*" instead of "# Heading"\n\n' +
                            "Use only basic Markdown formatting. Do NOT use backslashes to escape characters."
                    },
                    {
                        role: "user",
                        content: `Tell me about: ${topic}\n\n${context}`
                    }
                ]
            });

            return response.choices[0]?.message?.content || "No information available.";
        } catch (error) {
            logger.error("Error fetching topic information:", error);
            throw new Error("Failed to fetch topic information");
        }
    }

    async generateConversationalResponse(
        userMessage: string,
        conversationHistory: Array<{ role: string; content: string }>
    ): Promise<string> {
        try {
            // Prepare the messages array with the system message and conversation history
            const messages = [
                {
                    role: "system" as const,
                    content: `You are a helpful and friendly assistant. 
                    Engage in a natural conversation with the user, responding to their questions and comments.
                    Keep responses concise and relevant to the ongoing conversation.
                    
                    Format your responses using simple Markdown for better readability:
                    - Use *asterisks* for bold text (important information, headings)
                    - Use _underscores_ for italic text (emphasis)
                    - Use \`backticks\` for code or technical terms
                    - Use bullet points for lists
                    
                    IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.
                    Example: Use "*Heading*" instead of "# Heading"
                    
                    Use only basic Markdown formatting. Do NOT use backslashes to escape characters.`
                },
                ...conversationHistory.map((msg) => ({
                    role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
                    content: msg.content
                }))
            ];

            // Add the current user message if it's not already in the history
            if (
                conversationHistory.length === 0 ||
                conversationHistory[conversationHistory.length - 1].role !== "user"
            ) {
                messages.push({
                    role: "user" as const,
                    content: userMessage
                });
            }

            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 1024,
                messages
            });

            return response.choices[0]?.message?.content || "";
        } catch (error) {
            logger.error("Error generating conversational response with OpenAI:", error);
            throw new Error("Failed to generate conversational response");
        }
    }
}

export const openaiService = new OpenAIService();

export function registerTotalCryptoHoldingsIntent(
    getTotalHoldingsFunction: () => Promise<{ totalUsd: number; formattedReport: string }>
) {
    openaiService.registerTool({
        type: "function",
        function: {
            name: "get_total_crypto_holdings",
            description: "Get the total value of all your crypto holdings (Binance + wallets)",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        },
        handler: async () => {
            const { formattedReport } = await getTotalHoldingsFunction();
            return formattedReport;
        }
    });
}

/**
 * Register intent to get currency conversion rates
 */
export function registerCurrencyConversionIntent() {
    openaiService.registerTool({
        type: "function",
        function: {
            name: "convert_currency",
            description: "Convert an amount from one currency to another using real-time exchange rates",
            parameters: {
                type: "object",
                properties: {
                    amount: {
                        type: "number",
                        description: "The amount to convert"
                    },
                    from_currency: {
                        type: "string",
                        description: "The source currency code (e.g., USD, EUR, CZK)"
                    },
                    to_currency: {
                        type: "string",
                        description: "The target currency code (e.g., USD, EUR, CZK)"
                    }
                },
                required: ["amount", "from_currency", "to_currency"]
            }
        },
        handler: async (parameters: Record<string, any>) => {
            try {
                const { amount, from_currency, to_currency } = parameters;

                const convertedAmount = await exchangeRateService.convertCurrency(amount, from_currency, to_currency);

                const formattedAmount = exchangeRateService.formatCurrencyAmount(convertedAmount, to_currency);

                return {
                    success: true,
                    result: {
                        original_amount: amount,
                        original_currency: from_currency,
                        converted_amount: convertedAmount.toNumber(),
                        converted_currency: to_currency,
                        formatted_result: formattedAmount
                    }
                };
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error("Currency conversion failed:", error);
                return {
                    success: false,
                    error: `Failed to convert currency: ${errorMessage}`
                };
            }
        }
    });
}
