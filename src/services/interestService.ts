import { logger } from "../utils/logger";
import { databaseService } from "./database";
import { langchainService } from "./langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SingleMessageResponse } from "../bot/handlers/messageHandlers";
import { registerCallbackQueryHandler } from "../bot/handlers/callbackQueryHandlers";

export class InterestService {
    constructor() {}

    /**
     * Track a new interest
     */
    async trackInterest(topic: string, description?: string) {
        try {
            return await databaseService.createInterest(topic, description);
        } catch (error) {
            logger.error("Failed to track interest:", error);
            throw new Error("Failed to track interest in database");
        }
    }

    /**
     * Get all tracked interests
     */
    async getInterests() {
        try {
            return await databaseService.getInterests();
        } catch (error) {
            logger.error("Failed to get interests:", error);
            throw new Error("Failed to get interests from database");
        }
    }

    /**
     * Delete an interest
     */
    async deleteInterest(interestId: string) {
        try {
            await databaseService.deleteInterest(interestId);
            return { success: true, message: "Interest deleted successfully" };
        } catch (error) {
            logger.error("Failed to delete interest:", error);
            throw new Error("Failed to delete interest from database");
        }
    }
}

export function initInterestService() {
    // Register callback query handlers for interest actions
    registerCallbackQueryHandler(
        /^remove_interest:(.+)$/,
        async (query, bot) => {
            try {
                const interestId = query.data?.split(":")[1];
                if (!interestId) {
                    await bot.answerCallbackQuery(query.id, { text: "Invalid interest ID" });
                    return;
                }

                await interestService.deleteInterest(interestId);

                // Answer the callback query
                await bot.answerCallbackQuery(query.id, {
                    text: "Interest removed successfully!"
                });

                // Update the message to show the interest was deleted
                if (query.message && query.message.text) {
                    // Preserve the original message and append status
                    const originalText = query.message.text;
                    const updatedText = `${originalText}\n\n_✅ Interest deleted successfully_`;

                    await bot.editMessageText(updatedText, {
                        chat_id: query.message.chat.id,
                        message_id: query.message.message_id,
                        parse_mode: "Markdown"
                    });
                }
            } catch (error) {
                logger.error("Error handling remove_interest callback:", error);
                await bot.answerCallbackQuery(query.id, {
                    text: "Error removing interest. Please try again."
                });
            }
        },
        "Handler for interest removal buttons"
    );

    // Create LangChain tools
    const trackInterestTool = tool(
        async ({ topic, description }) => {
            await interestService.trackInterest(topic, description);
            return {
                success: true,
                message: "Interest added successfully. You will be notified with the details about the topic soon."
            };
        },
        {
            name: "track_interest_in_topic",
            description:
                "Use when the user asks a question or expresses curiosity or interest in learning about a topic or subject",
            schema: z.object({
                topic: z.string().describe("The topic or interest to track"),
                description: z.string().optional().describe("Additional details or context about the interest")
            })
        }
    );

    const getInterestsTool = tool(
        async () => {
            const interests = await interestService.getInterests();

            if (interests.length === 0) {
                return {
                    text: "You don't have any tracked interests.",
                    success: true,
                    interests: []
                };
            }

            // Create a separate message for each interest
            const messages: SingleMessageResponse[] = interests.map((interest) => {
                // Create delete button for this interest
                const inlineKeyboard = [
                    [
                        {
                            text: `🗑️ Remove: ${interest.topic.substring(0, 30)}${interest.topic.length > 30 ? "..." : ""}`,
                            callback_data: `remove_interest:${interest.id}`
                        }
                    ]
                ];

                // Format interest details
                const interestText = `*${interest.topic}*\n${interest.description ? `_Description_: ${interest.description}\n` : ""}`;

                return {
                    text: interestText,
                    buttons: {
                        inline_keyboard: inlineKeyboard
                    }
                };
            });

            // Add header message
            messages.unshift({
                text: `*Your Interests (${interests.length})*\nHere are your tracked interests:`
            });

            return messages;
        },
        {
            name: "get_interests",
            description: "Retrieve all tracked interests",
            schema: z.object({})
        }
    );

    // Register tools with LangChain service
    langchainService.registerTools([trackInterestTool, getInterestsTool]);

    return interestService;
}

export const interestService = new InterestService();
