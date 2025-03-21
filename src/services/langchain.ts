import { ChatOpenAI } from "@langchain/openai";
import { BaseMessageFields, ChatMessage, HumanMessage, MessageContent, SystemMessage } from "@langchain/core/messages";
import { StructuredTool, tool } from "@langchain/core/tools";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import { ReadableStream } from "stream/web";
import { z } from "zod";
import streamToBase64 from "../utils/streamToBase64";
import { Stream } from "stream";
import { parsePDF } from "../utils/pdfParser";

export class LangchainService {
    private tools: StructuredTool[] = [];
    private handlers: Map<string, (parameters: any) => Promise<any>> = new Map();
    private chatModel: ChatOpenAI;
    private chat4oModel: ChatOpenAI;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required");
        }

        this.chatModel = new ChatOpenAI({
            openAIApiKey: env.OPENAI_API_KEY,
            modelName: "o3-mini"
            // temperature: 0
        });
        this.chat4oModel = new ChatOpenAI({
            openAIApiKey: env.OPENAI_API_KEY,
            model: "gpt-4o"
            // temperature: 0
        });
    }

    /**
     * Creates a new instance of LangchainService with custom model configuration
     */
    static createWithModel(modelName: string, temperature?: number): LangchainService {
        const service = new LangchainService();
        service.chatModel = new ChatOpenAI({
            openAIApiKey: env.OPENAI_API_KEY,
            modelName: modelName,
            temperature: temperature ?? undefined
        });
        return service;
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

    /**
     * Use a single tool to extract structured data directly from content
     * @param tool The structured tool to use for extraction
     * @param content The content to extract data from
     * @param systemPrompt Optional system prompt to guide extraction
     * @returns The structured data extracted by the tool
     */
    async extractWithTool<T>(
        tool: StructuredTool,
        content: string | MessageContent,
        systemPrompt?: string
    ): Promise<T> {
        try {
            // Register the tool if not already registered
            if (!this.tools.includes(tool)) {
                this.registerTools([tool]);
            }

            // Bind the tool to the model
            const llmWithTools = this.chatModel.bindTools([tool]);

            // Create messages
            const messages = [
                new SystemMessage(
                    systemPrompt ||
                        `You are a data extraction assistant. Extract structured data from the provided content using the appropriate tool.
                    Only respond with a tool call, no explanations or other text.`
                ),
                new HumanMessage({ content: content })
            ];

            // Get response with tool call
            const response = await llmWithTools.invoke(messages);

            // Extract the tool call from the response
            const toolCall = response.tool_calls?.[0];
            if (!toolCall) {
                throw new Error("No tool call received from LangChain");
            }

            if (toolCall.name !== tool.name) {
                throw new Error(`Expected tool ${tool.name} but got ${toolCall.name}`);
            }

            return toolCall.args as T;
        } catch (error) {
            logger.error(`Error extracting data with tool ${tool.name}:`, error);
            throw new Error(`Failed to extract data: ${error}`);
        }
    }

    /**
     * Extract structured data from an image according to a Zod schema
     * @param imageStream Stream containing the image data
     * @param zodSchema Zod schema defining the structure of data to extract
     * @param customPrompt Optional custom prompt to guide the extraction
     * @returns The structured data extracted from the image, validated against the Zod schema
     */
    async extractDataFromImage<T extends z.ZodObject<any>>(
        imageStream: ReadableStream | Stream,
        zodSchema: T,
        customPrompt?: string
    ): Promise<z.infer<T>> {
        try {
            // Convert stream to base64 if needed
            const imageBase64 =
                imageStream instanceof Buffer ? imageStream.toString("base64") : await streamToBase64(imageStream);

            // Create a tool for extracting data according to the schema
            const extractionTool = tool(async (args: z.infer<T>) => args, {
                name: "extractStructuredData",
                description: "Extract structured data from an image according to a specific schema",
                schema: zodSchema
            });

            // Create the system message with schema information
            const schemaDescription = JSON.stringify(zodSchema.description, null, 2);
            const systemPrompt =
                customPrompt ||
                `You are a data extraction assistant. Extract structured data from the provided image according to this schema: ${schemaDescription}
                Use the extractStructuredData tool to return the extracted data.
                Include all required fields. If you cannot determine a field value, use null or an empty string.`;

            // Bind the tool to the model
            const llmWithTools = this.chat4oModel.bindTools([extractionTool]);

            // Create messages with image content
            const messages = [
                new SystemMessage(systemPrompt),
                new HumanMessage({
                    content: [
                        {
                            type: "text",
                            text: "Extract structured data from this image according to the specified schema."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                })
            ];

            // Get response with tool call
            const response = await llmWithTools.invoke(messages);

            // Extract the tool call from the response
            const toolCall = response.tool_calls?.[0];
            if (!toolCall) {
                throw new Error("No tool call received from LangChain");
            }

            if (toolCall.name !== extractionTool.name) {
                throw new Error(`Expected tool ${extractionTool.name} but got ${toolCall.name}`);
            }

            // The args are already validated by the tool's schema
            return toolCall.args as z.infer<T>;
        } catch (error) {
            logger.error("Error extracting data from image:", error);
            throw new Error(`Failed to extract data from image: ${error}`);
        }
    }

    /**
     * Extract structured data from a PDF according to a Zod schema
     * @param pdfStream Stream containing the PDF data
     * @param zodSchema Zod schema defining the structure of data to extract
     * @param customPrompt Optional custom prompt to guide the extraction
     * @returns The structured data extracted from the PDF, validated against the Zod schema
     */
    async extractDataFromPDF<T extends z.ZodObject<any>>(
        pdfStream: ReadableStream | Stream,
        zodSchema: T,
        customPrompt?: string
    ): Promise<z.infer<T>> {
        try {
            // Parse the PDF into text
            const pdfText = await parsePDF(pdfStream);

            // Create a tool for extracting data according to the schema
            const extractionTool = tool(async (args: z.infer<T>) => args, {
                name: "extract_pdf_data",
                description: "Extract structured data from PDF text content",
                schema: zodSchema
            });

            // Use the text content for extraction
            const result = await this.extractWithTool<z.infer<T>>(extractionTool, pdfText, customPrompt);

            return result;
        } catch (error) {
            logger.error("Error extracting data from PDF:", error);
            throw new Error(`Failed to extract data from PDF: ${error}`);
        }
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

            console.log(`Tool: ${toolCall.name}`);

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
