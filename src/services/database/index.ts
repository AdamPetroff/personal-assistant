import { DB, Taskstatus } from "./db";
import { logger } from "../../utils/logger";
import { db } from "./client";
import { FinanceSourceRepository } from "./repositories/FinanceSourceRepository";

export class DatabaseService {
    private financeSourceRepository: FinanceSourceRepository;

    constructor() {
        this.financeSourceRepository = new FinanceSourceRepository();
    }

    /**
     * Create a new task
     */
    async createTask(title: string, description?: string, dueDate?: Date) {
        try {
            const newTask = {
                title,
                description: description || null,
                status: "TODO" as const,
                dueDate: dueDate || null,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("task")
                .values(newTask)
                .returning(["id", "title", "description", "status", "dueDate", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
        } catch (error) {
            logger.error("Failed to create task:", error);
            throw new Error("Failed to create task in database");
        }
    }

    /**
     * Get tasks with optional status filter
     */
    async getTasks(status?: Taskstatus) {
        try {
            let query = db.selectFrom("task").selectAll().orderBy("createdAt", "desc");

            if (status) {
                query = query.where("status", "=", status);
            }

            return await query.execute();
        } catch (error) {
            logger.error("Failed to fetch tasks:", error);
            throw new Error("Failed to fetch tasks from database");
        }
    }

    /**
     * Update a task's status
     */
    async updateTaskStatus(taskId: string, status: Taskstatus) {
        try {
            const updateData = {
                status,
                updatedAt: new Date()
            };

            const result = await db
                .updateTable("task")
                .set(updateData)
                .where("id", "=", taskId)
                .returning(["id", "title", "description", "status", "dueDate", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
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
            const updateData = {
                status: status as Taskstatus,
                updatedAt: new Date()
            };

            const result = await db
                .updateTable("task")
                .set(updateData)
                .where("id", "=", taskId)
                .returning(["id", "title", "description", "status", "dueDate", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
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
            await db.deleteFrom("task").where("id", "=", taskId).execute();
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
            const newReminder = {
                title,
                description: description || null,
                reminderTime,
                completed: false,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("reminder")
                .values(newReminder)
                .returning(["id", "title", "description", "reminderTime", "completed", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
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
            let query = db.selectFrom("reminder").selectAll().orderBy("reminderTime", "asc");

            if (completed !== undefined) {
                query = query.where("completed", "=", completed);
            }

            return await query.execute();
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
            const updateData = {
                completed,
                updatedAt: new Date()
            };

            const result = await db
                .updateTable("reminder")
                .set(updateData)
                .where("id", "=", reminderId)
                .returning(["id", "title", "description", "reminderTime", "completed", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
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
            await db.deleteFrom("reminder").where("id", "=", reminderId).execute();
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
            const newInterest = {
                topic,
                description: description || null,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("interest")
                .values(newInterest)
                .returning(["id", "topic", "description", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result;
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
            return await db.selectFrom("interest").selectAll().orderBy("createdAt", "desc").execute();
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
            await db.deleteFrom("interest").where("id", "=", interestId).execute();
        } catch (error) {
            logger.error("Failed to delete interest:", error);
            throw new Error("Failed to delete interest from database");
        }
    }

    /**
     * Create a new finance source
     * @deprecated Use FinanceSourceRepository directly
     */
    async createFinanceSource(name: string, type: string, accountNumber?: string, description?: string) {
        return this.financeSourceRepository.create(name, type, accountNumber, description);
    }

    /**
     * Get all finance sources
     * @deprecated Use FinanceSourceRepository directly
     */
    async getFinanceSources() {
        return this.financeSourceRepository.getAll();
    }

    /**
     * Get a finance source by ID
     * @deprecated Use FinanceSourceRepository directly
     */
    async getFinanceSourceById(sourceId: string) {
        return this.financeSourceRepository.getById(sourceId);
    }

    /**
     * Update a finance source
     * @deprecated Use FinanceSourceRepository directly
     */
    async updateFinanceSource(
        sourceId: string,
        updates: {
            name?: string;
            type?: string;
            accountNumber?: string | null;
            description?: string | null;
        }
    ) {
        return this.financeSourceRepository.update(sourceId, updates);
    }

    /**
     * Delete a finance source
     * @deprecated Use FinanceSourceRepository directly
     */
    async deleteFinanceSource(sourceId: string) {
        return this.financeSourceRepository.delete(sourceId);
    }

    /**
     * Save a bank statement to the database
     * @deprecated Use FinanceSourceRepository directly
     */
    async saveFinanceStatement(
        financeSourceId: string,
        statement: {
            accountBalance: number;
            accountBalanceUsd: number;
            statementDate: Date;
            data: any;
            fileName?: string;
        }
    ) {
        return this.financeSourceRepository.saveStatement(financeSourceId, statement);
    }

    /**
     * Get all statements for a finance source
     * @deprecated Use FinanceSourceRepository directly
     */
    async getFinanceStatementsBySource(sourceId: string) {
        return this.financeSourceRepository.getStatementsBySourceId(sourceId);
    }

    /**
     * Get the latest statement for each finance source
     * @deprecated Use FinanceSourceRepository directly
     */
    async getLatestFinanceStatements() {
        return this.financeSourceRepository.getLatestStatements();
    }

    /**
     * Get the total balance across all finance sources based on latest statements
     * @deprecated Use FinanceSourceRepository directly
     */
    async getTotalFinanceBalance() {
        return this.financeSourceRepository.getTotalBalance();
    }
}

// Export a singleton instance
export const databaseService = new DatabaseService();
