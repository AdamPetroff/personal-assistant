import { ChatOpenAI } from "@langchain/openai";
import { ChatMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import { logger } from "../utils/logger";
import { env } from "../config/constants";

export class LangchainService {
    private tools: StructuredTool[] = [];
    private handlers: Map<string, (parameters: any) => Promise<any>> = new Map();
    private chatModel: ChatOpenAI;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required");
        }

        this.chatModel = new ChatOpenAI({
            openAIApiKey: env.OPENAI_API_KEY,
            modelName: "gpt-4o",
            temperature: 0
        });
    }

    registerTools(tools: StructuredTool[]) {
        for (const tool of tools) {
            this.tools.push(tool);
            // Store the handler function for direct access
            this.handlers.set(tool.name, async (parameters: any) => {
                try {
                    // Call the tool with the parameters
                    const result = await tool.invoke(parameters);
                    return result;
                } catch (error) {
                    logger.error(`Error executing tool ${tool.name}:`, error);
                    throw error;
                }
            });
        }
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
            // Create the system message with tool descriptions
            const toolDescriptions = this.tools
                .map((tool) => `- If they want to ${tool.description}, use ${tool.name}`)
                .join("\n");

            const systemPrompt = `You are a personal task management assistant. Parse user messages to determine their intent:
            ${toolDescriptions}
            Extract relevant dates, times, and descriptions from their message.
            Respond with a single tool call that best matches their intent. It's currently ${new Date().toISOString()}.
            
            IMPORTANT: Make sure to extract ALL required parameters from the user's message. If a parameter is missing, use a reasonable default or ask for it explicitly.`;

            // Bind tools to the model
            const llmWithTools = this.chatModel.bindTools(this.tools);

            // Use a simpler approach with direct message passing
            const response = await llmWithTools.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(userMessage)
            ]);

            // Extract the tool call from the response
            const toolCall = response.tool_calls?.[0];
            if (!toolCall) {
                throw new Error("No tool call received from LangChain");
            }

            const tool = this.tools.find((t) => t.name === toolCall.name);

            return {
                intent: toolCall.name,
                intentDescription: tool?.description || toolCall.name,
                parameters: toolCall.args
            };
        } catch (error) {
            logger.error("Error parsing intent with LangChain:", error);
            throw new Error("Failed to parse intent");
        }
    }

    async generateResponse(
        intent: string,
        parameters: Record<string, any>,
        context?: Record<string, any>
    ): Promise<string> {
        try {
            const systemContent = `You are a helpful task management assistant. 
        Generate natural, friendly responses based on the intent and parameters provided.
        Keep responses concise and action-oriented.
        
        Format your responses using simple Markdown for better readability:
        - Use *asterisks* for bold text (important information, headings)
        - Use _underscores_ for italic text (emphasis)
        - Use \`backticks\` for code or technical terms
        - Use bullet points for lists
        
        IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.
        Example: Use "*Heading*" instead of "# Heading"
        
        Use only basic Markdown formatting. Do NOT use backslashes to escape characters.`;

            const userContent = JSON.stringify({
                intent,
                parameters,
                context
            });

            // Use a simpler approach without ChatPromptTemplate
            const response = await this.chatModel.invoke([
                new SystemMessage(systemContent),
                new HumanMessage(userContent)
            ]);

            return response.content.toString();
        } catch (error) {
            logger.error("Error generating response with LangChain:", error);
            throw new Error("Failed to generate response");
        }
    }

    async getTopicInformation(topic: string, context?: string): Promise<string> {
        try {
            const systemContent = `You are a knowledgeable assistant. Provide a concise but informative overview of the given topic. Include key points, interesting facts, and potential resources for learning more. Keep the response under 300 words.

        Format your response using simple Markdown for better readability:
        - Use *asterisks* for bold text (important terms, headings)
        - Use _underscores_ for italic text (emphasis)
        - Use \`backticks\` for code or technical terms
        - Use bullet points for lists

        IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.
        Example: Use "*Heading*" instead of "# Heading"

        Use only basic Markdown formatting. Do NOT use backslashes to escape characters.`;

            const userContent = `Tell me about: ${topic}\n\n${context || ""}`;

            // Use a simpler approach without ChatPromptTemplate
            const response = await this.chatModel.invoke([
                new SystemMessage(systemContent),
                new HumanMessage(userContent)
            ]);

            return response.content.toString();
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
            // Convert conversation history to LangChain message format
            const messages = [
                new SystemMessage(`You are a helpful and friendly assistant. 
        Engage in a natural conversation with the user, responding to their questions and comments.
        Keep responses concise and relevant to the ongoing conversation.
        
        Format your responses using simple Markdown for better readability:
        - Use *asterisks* for bold text (important information, headings)
        - Use _underscores_ for italic text (emphasis)
        - Use \`backticks\` for code or technical terms
        - Use bullet points for lists
        
        IMPORTANT: For headings, use *bold text* instead of # symbols. Telegram doesn't support # for headings.
        Example: Use "*Heading*" instead of "# Heading"
        
        Use only basic Markdown formatting. Do NOT use backslashes to escape characters.`)
            ];

            // Add conversation history
            for (const msg of conversationHistory) {
                if (msg.role === "user") {
                    messages.push(new HumanMessage(msg.content));
                } else {
                    messages.push(new ChatMessage({ content: msg.content, role: "assistant" }));
                }
            }

            // Add the current user message if it's not already in the history
            if (
                conversationHistory.length === 0 ||
                conversationHistory[conversationHistory.length - 1].role !== "user"
            ) {
                messages.push(new HumanMessage(userMessage));
            }

            // Use the chat model directly
            const response = await this.chatModel.invoke(messages);

            return response.content.toString();
        } catch (error) {
            logger.error("Error generating conversational response with LangChain:", error);
            throw new Error("Failed to generate conversational response");
        }
    }
}

export const langchainService = new LangchainService();
