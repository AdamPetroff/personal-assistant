import { langchainService } from "../services/langchain";
import { logger } from "../utils/logger";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Example weather tool schema using Zod
 */
const weatherSchema = z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA or country e.g. France"),
    unit: z.enum(["celsius", "fahrenheit"]).describe("The unit of temperature to use. Defaults to celsius.").optional()
});

/**
 * Example weather tool for testing the Langchain service
 */
const weatherTool = tool(
    async ({ location, unit = "celsius" }) => {
        // This is a mock implementation that would be replaced with a real API call
        logger.info(`Getting weather for ${location} in ${unit}`);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock response based on location
        const mockWeatherData = {
            location,
            temperature: Math.floor(Math.random() * 30) + (unit === "fahrenheit" ? 50 : 10),
            unit,
            condition: ["sunny", "cloudy", "rainy", "stormy"][Math.floor(Math.random() * 4)],
            humidity: Math.floor(Math.random() * 100),
            windSpeed: Math.floor(Math.random() * 30)
        };

        return mockWeatherData;
    },
    {
        name: "get_weather",
        description: "get the current weather in a given location",
        schema: weatherSchema
    }
);

/**
 * Example reminder tool schema using Zod
 */
const reminderSchema = z.object({
    task: z.string().describe("The task to be reminded about"),
    time: z.string().describe("The time for the reminder in ISO format or natural language (e.g., 'tomorrow at 3pm')"),
    priority: z.enum(["low", "medium", "high"]).describe("The priority of the reminder. Defaults to medium.").optional()
});

/**
 * Example reminder tool for testing the Langchain service
 */
const reminderTool = tool(
    async ({ task, time, priority = "medium" }) => {
        // This is a mock implementation that would be replaced with a real reminder service
        logger.info(`Setting reminder for "${task}" at ${time} with ${priority} priority`);

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Mock response
        return {
            success: true,
            reminder: {
                id: `reminder_${Date.now()}`,
                task,
                time,
                priority,
                created: new Date().toISOString()
            }
        };
    },
    {
        name: "set_reminder",
        description: "set a reminder for a specific time",
        schema: reminderSchema
    }
);

/**
 * Example calculator tool schema using Zod
 */
const calculatorSchema = z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("The type of operation to execute."),
    number1: z.number().describe("The first number to operate on."),
    number2: z.number().describe("The second number to operate on.")
});

/**
 * Example calculator tool for testing the Langchain service
 */
const calculatorTool = tool(
    async ({ operation, number1, number2 }) => {
        logger.info(`Performing ${operation} on ${number1} and ${number2}`);

        let result: number;
        switch (operation) {
            case "add":
                result = number1 + number2;
                break;
            case "subtract":
                result = number1 - number2;
                break;
            case "multiply":
                result = number1 * number2;
                break;
            case "divide":
                if (number2 === 0) {
                    throw new Error("Cannot divide by zero");
                }
                result = number1 / number2;
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }

        return {
            operation,
            number1,
            number2,
            result
        };
    },
    {
        name: "calculator",
        description: "perform mathematical operations",
        schema: calculatorSchema
    }
);

/**
 * Main function to test the Langchain service
 */
async function testLangchainService() {
    try {
        // Create an array of tools
        const tools = [weatherTool, reminderTool, calculatorTool];

        // Register all tools with the service
        langchainService.registerTools(tools);
        logger.info("Registered tools with Langchain service");

        // Test messages to parse intents
        const testMessages = [
            "What's the weather like in New York?",
            "Remind me to call mom tomorrow at 5pm",
            "What's the temperature in Paris in fahrenheit?",
            "Set a high priority reminder to finish the report by 3pm today",
            "Calculate 75 * 20"
        ];

        // Process each test message
        for (const message of testMessages) {
            logger.info(`\n\nProcessing message: "${message}"`);

            // Parse the intent
            const { intent, parameters, intentDescription } = await langchainService.parseIntent(message);

            logger.info(`Detected intent: ${intent} (${intentDescription})`);
            logger.info(`Parameters:`, parameters);

            // Handle the intent
            const result = await langchainService.handleIntent(intent, parameters);
            logger.info(`Result:`, result);

            // Generate a response
            const response = await langchainService.generateResponse(intent, parameters, { result });
            logger.info(`Generated response: ${response}`);
        }

        // Test conversational response
        const conversationHistory = [
            { role: "user", content: "Hello, can you help me with something?" },
            { role: "assistant", content: "Of course! I'm here to help. What do you need assistance with?" }
        ];

        const conversationalResponse = await langchainService.generateConversationalResponse(
            "I need information about TypeScript",
            conversationHistory
        );

        logger.info(`\n\nConversational response: ${conversationalResponse}`);
    } catch (error) {
        logger.error("Error testing Langchain service:", error);
    }
}

// Run the test
testLangchainService().then(() => {
    logger.info("Langchain service test completed");
});
