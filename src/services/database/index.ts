import { PrismaClient, TaskStatus } from "@prisma/client";
import { logger } from "../../utils/logger";

// Initialize Prisma client
const prisma = new PrismaClient();

export class DatabaseService {
    /**
     * Create a new task
     */
    async createTask(title: string, description?: string, dueDate?: Date) {
        try {
            return await prisma.task.create({
                data: {
                    title,
                    description,
                    status: "TODO",
                    dueDate
                }
            });
        } catch (error) {
            logger.error("Failed to create task:", error);
            throw new Error("Failed to create task in database");
        }
    }

    /**
     * Get tasks with optional status filter
     */
    async getTasks(status?: TaskStatus) {
        try {
            return await prisma.task.findMany({
                where: status ? { status } : undefined,
                orderBy: { createdAt: "desc" }
            });
        } catch (error) {
            logger.error("Failed to fetch tasks:", error);
            throw new Error("Failed to fetch tasks from database");
        }
    }

    /**
     * Update a task's status
     */
    async updateTaskStatus(taskId: string, status: TaskStatus) {
        try {
            return await prisma.task.update({
                where: { id: taskId },
                data: { status }
            });
        } catch (error) {
            logger.error("Failed to update task status:", error);
            throw new Error("Failed to update task status in database");
        }
    }

    /**
     * Mark a task as complete/incomplete
     */
    async updateTaskCompletion(taskId: string, isComplete: boolean) {
        try {
            const status = isComplete ? "DONE" : "TODO";
            return await prisma.task.update({
                where: { id: taskId },
                data: { status }
            });
        } catch (error) {
            logger.error("Failed to update task completion status:", error);
            throw new Error("Failed to update task completion status");
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string) {
        try {
            await prisma.task.delete({
                where: { id: taskId }
            });
        } catch (error) {
            logger.error("Failed to delete task:", error);
            throw new Error("Failed to delete task from database");
        }
    }

    /**
     * Create a new reminder
     */
    async createReminder(title: string, reminderTime: Date, description?: string) {
        try {
            return await prisma.reminder.create({
                data: {
                    title,
                    description,
                    reminderTime,
                    completed: false
                }
            });
        } catch (error) {
            logger.error("Failed to create reminder:", error);
            throw new Error("Failed to create reminder in database");
        }
    }

    /**
     * Get all reminders
     */
    async getReminders(completed?: boolean) {
        try {
            return await prisma.reminder.findMany({
                where: completed !== undefined ? { completed } : undefined,
                orderBy: { reminderTime: "asc" }
            });
        } catch (error) {
            logger.error("Failed to fetch reminders:", error);
            throw new Error("Failed to fetch reminders from database");
        }
    }

    /**
     * Mark a reminder as complete/incomplete
     */
    async updateReminderCompletion(reminderId: string, completed: boolean) {
        try {
            return await prisma.reminder.update({
                where: { id: reminderId },
                data: { completed }
            });
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
            await prisma.reminder.delete({
                where: { id: reminderId }
            });
        } catch (error) {
            logger.error("Failed to delete reminder:", error);
            throw new Error("Failed to delete reminder from database");
        }
    }

    /**
     * Create a new interest
     */
    async createInterest(topic: string, description?: string) {
        try {
            return await prisma.interest.create({
                data: {
                    topic,
                    description
                }
            });
        } catch (error) {
            logger.error("Failed to create interest:", error);
            throw new Error("Failed to create interest in database");
        }
    }

    /**
     * Get all interests
     */
    async getInterests() {
        try {
            return await prisma.interest.findMany({
                orderBy: { createdAt: "desc" }
            });
        } catch (error) {
            logger.error("Failed to fetch interests:", error);
            throw new Error("Failed to fetch interests from database");
        }
    }

    /**
     * Delete an interest
     */
    async deleteInterest(interestId: string) {
        try {
            await prisma.interest.delete({
                where: { id: interestId }
            });
        } catch (error) {
            logger.error("Failed to delete interest:", error);
            throw new Error("Failed to delete interest from database");
        }
    }
}

// Export a singleton instance
export const databaseService = new DatabaseService();
