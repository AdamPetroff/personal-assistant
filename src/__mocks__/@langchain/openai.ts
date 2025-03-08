// Mock implementation of the ChatOpenAI class
export class ChatOpenAI {
    constructor(options: any) {
        // Store options if needed for tests
    }

    async invoke(messages: any[]) {
        // Return a mock response based on the input messages
        const lastMessage = messages[messages.length - 1].content;

        if (typeof lastMessage === "string") {
            if (lastMessage.includes("weather")) {
                return {
                    content: "Here's the weather information you requested.",
                    tool_calls: [
                        {
                            name: "get_weather",
                            args: { location: "New York", unit: "celsius" }
                        }
                    ]
                };
            } else if (lastMessage.toLowerCase().includes("remind")) {
                return {
                    content: "I'll set a reminder for you.",
                    tool_calls: [
                        {
                            name: "set_reminder",
                            args: { task: "call mom", time: "tomorrow at 5pm", priority: "medium" }
                        }
                    ]
                };
            } else if (lastMessage.includes("calculate") || lastMessage.includes("*")) {
                return {
                    content: "Here's the calculation result.",
                    tool_calls: [
                        {
                            name: "calculator",
                            args: { operation: "multiply", number1: 75, number2: 20 }
                        }
                    ]
                };
            }
        } else if (typeof lastMessage === "object" && lastMessage !== null) {
            // Handle JSON object inputs (for generateResponse)
            const jsonInput = lastMessage as Record<string, any>;
            return {
                content: "Mock response for " + (jsonInput.intent || "conversation")
            };
        }

        // Default response for conversations
        return {
            content: "I'm a mock AI assistant response. How can I help you today?"
        };
    }

    bindTools(tools: any[]) {
        // Return self with the tools bound
        return this;
    }
}
