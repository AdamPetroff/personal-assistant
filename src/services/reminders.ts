import { logger } from "../utils/logger";
import { databaseService } from "./database";

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
    return remindersService;
}
