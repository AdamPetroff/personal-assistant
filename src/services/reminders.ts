import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../utils/logger";
import { databaseService } from "./database";
import { langchainService } from "./langchain";

export class RemindersService {
    /**
     * Create a new reminder
     */
    async createReminder(title: string, reminderTime: Date, description?: string) {
        try {
            return databaseService.createReminder(title, reminderTime, description);
        } catch (error) {
            logger.error("Failed to create reminder:", error);
            throw new Error("Failed to create reminder");
        }
    }

    /**
     * Get all reminders with optional completion filter
     */
    async getReminders(completed?: boolean) {
        try {
            return databaseService.getReminders(completed);
        } catch (error) {
            logger.error("Failed to fetch reminders:", error);
            throw new Error("Failed to fetch reminders");
        }
    }

    /**
     * Get upcoming reminders that are not completed
     */
    async getUpcomingReminders() {
        try {
            const reminders = await databaseService.getReminders(false);
            const now = new Date();
            return reminders.filter((reminder) => new Date(reminder.reminderTime) > now);
        } catch (error) {
            logger.error("Failed to fetch upcoming reminders:", error);
            throw new Error("Failed to fetch upcoming reminders");
        }
    }

    /**
     * Mark a reminder as complete/incomplete
     */
    async updateReminderCompletion(reminderId: string, completed: boolean) {
        try {
            return databaseService.updateReminderCompletion(reminderId, completed);
        } catch (error) {
            logger.error("Failed to update reminder completion status:", error);
            throw new Error("Failed to update reminder completion status");
        }
    }

    /**
     * Delete a reminder
     */
    async deleteReminder(reminderId: string) {
        try {
            await databaseService.deleteReminder(reminderId);
            return { success: true, message: "Reminder deleted successfully" };
        } catch (error) {
            logger.error("Failed to delete reminder:", error);
            throw new Error("Failed to delete reminder");
        }
    }
}

// Create a singleton instance
export const remindersService = new RemindersService();

export function initRemindersService() {
    // Create LangChain tools
    const createReminderTool = tool(
        async ({ title, reminderTime, description }) => {
            return remindersService.createReminder(title, new Date(reminderTime), description);
        },
        {
            name: "create_reminder",
            description: "Set a reminder for a specific date and time",
            schema: z.object({
                title: z.string().describe("What to be reminded about"),
                reminderTime: z.string().describe("ISO date-time string for when to send the reminder"),
                description: z.string().optional().describe("Additional details about the reminder")
            })
        }
    );

    const getUpcomingRemindersTool = tool(
        async () => {
            return remindersService.getUpcomingReminders();
        },
        {
            name: "get_upcoming_reminders",
            description: "Get all upcoming reminders that are not completed",
            schema: z.object({})
        }
    );

    const completeReminderTool = tool(
        async ({ reminderId }) => {
            return remindersService.updateReminderCompletion(reminderId, true);
        },
        {
            name: "complete_reminder",
            description: "Mark a reminder as complete",
            schema: z.object({
                reminderId: z.string().describe("The ID of the reminder to mark as complete")
            })
        }
    );

    const deleteReminderTool = tool(
        async ({ reminderId }) => {
            return remindersService.deleteReminder(reminderId);
        },
        {
            name: "delete_reminder",
            description: "Delete a reminder",
            schema: z.object({
                reminderId: z.string().describe("The ID of the reminder to delete")
            })
        }
    );

    // Register all reminder tools with LangChain service
    langchainService.registerTools([
        createReminderTool,
        getUpcomingRemindersTool,
        completeReminderTool,
        deleteReminderTool
    ]);

    return remindersService;
}
