import { logger } from "../utils/logger";
import { databaseService } from "./database";

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
    return interestService;
}

export const interestService = new InterestService();
