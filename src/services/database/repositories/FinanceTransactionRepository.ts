import { db } from "../client";
import { logger } from "../../../utils/logger";
import { Currency } from "../db";
import { TransactionCategory, TransactionCategoryEnum } from "../../../utils/revolut-statement-schema";

// Define a runtime finance transaction interface that matches the database shape
export interface FinanceTransactionModel {
    id: string;
    financeStatementId: string;
    name: string;
    amount: number;
    currency: Currency;
    usdAmount: number;
    category: string;
    transactionDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class FinanceTransactionRepository {
    /**
     * Creates a new finance transaction
     */
    async create(
        financeStatementId: string,
        name: string,
        amount: number,
        currency: Currency,
        usdAmount: number,
        category: string,
        transactionDate?: Date
    ): Promise<FinanceTransactionModel> {
        try {
            // Validate category against the TransactionCategory type
            this.validateCategory(category);

            const newTransaction = {
                financeStatementId,
                name,
                amount,
                currency,
                usdAmount,
                category,
                ...(transactionDate && { transactionDate }),
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("finance_transaction")
                .values(newTransaction)
                .returning([
                    "id",
                    "financeStatementId",
                    "name",
                    "amount",
                    "currency",
                    "usdAmount",
                    "category",
                    "transactionDate",
                    "createdAt",
                    "updatedAt"
                ])
                .executeTakeFirstOrThrow();

            return {
                ...result,
                amount: Number(result.amount),
                usdAmount: Number(result.usdAmount)
            } as FinanceTransactionModel;
        } catch (error) {
            logger.error("Failed to create finance transaction:", error);
            throw new Error("Failed to create finance transaction in database");
        }
    }

    /**
     * Get all transactions for a specific finance statement
     */
    async getByStatementId(statementId: string): Promise<FinanceTransactionModel[]> {
        try {
            const results = await db
                .selectFrom("finance_transaction")
                .selectAll()
                .where("financeStatementId", "=", statementId)
                .orderBy("createdAt", "desc")
                .execute();

            return results.map((result) => ({
                ...result,
                amount: Number(result.amount),
                usdAmount: Number(result.usdAmount)
            })) as FinanceTransactionModel[];
        } catch (error) {
            logger.error("Failed to fetch finance transactions:", error);
            throw new Error("Failed to fetch finance transactions from database");
        }
    }

    /**
     * Get all transactions by category
     */
    async getByCategory(category: TransactionCategory): Promise<FinanceTransactionModel[]> {
        try {
            // Validate category
            this.validateCategory(category);

            const results = await db
                .selectFrom("finance_transaction")
                .selectAll()
                .where("category", "=", category)
                .orderBy("transactionDate", "desc")
                .execute();

            return results.map((result) => ({
                ...result,
                amount: Number(result.amount),
                usdAmount: Number(result.usdAmount)
            })) as FinanceTransactionModel[];
        } catch (error) {
            logger.error("Failed to fetch finance transactions by category:", error);
            throw new Error("Failed to fetch finance transactions by category from database");
        }
    }

    /**
     * Update a transaction's category by transaction ID
     */
    async updateCategory(transactionId: string, category: TransactionCategory): Promise<FinanceTransactionModel> {
        try {
            // Validate category
            this.validateCategory(category);

            const result = await db
                .updateTable("finance_transaction")
                .set({
                    category,
                    updatedAt: new Date()
                })
                .where("id", "=", transactionId)
                .returning([
                    "id",
                    "financeStatementId",
                    "name",
                    "amount",
                    "currency",
                    "usdAmount",
                    "category",
                    "transactionDate",
                    "createdAt",
                    "updatedAt"
                ])
                .executeTakeFirstOrThrow();

            return {
                ...result,
                amount: Number(result.amount),
                usdAmount: Number(result.usdAmount)
            } as FinanceTransactionModel;
        } catch (error) {
            logger.error("Failed to update transaction category:", error);
            throw new Error("Failed to update transaction category in database");
        }
    }

    /**
     * Update a finance transaction
     */
    async update(
        transactionId: string,
        updates: {
            name?: string;
            amount?: number;
            currency?: Currency;
            usdAmount?: number;
            category?: string;
            transactionDate?: Date;
        }
    ): Promise<FinanceTransactionModel> {
        try {
            // Validate category if it's being updated
            if (updates.category) {
                this.validateCategory(updates.category);
            }

            const updateData = {
                ...updates,
                updatedAt: new Date()
            };

            const result = await db
                .updateTable("finance_transaction")
                .set(updateData)
                .where("id", "=", transactionId)
                .returning([
                    "id",
                    "financeStatementId",
                    "name",
                    "amount",
                    "currency",
                    "usdAmount",
                    "category",
                    "transactionDate",
                    "createdAt",
                    "updatedAt"
                ])
                .executeTakeFirstOrThrow();

            return {
                ...result,
                amount: Number(result.amount),
                usdAmount: Number(result.usdAmount)
            } as FinanceTransactionModel;
        } catch (error) {
            logger.error("Failed to update finance transaction:", error);
            throw new Error("Failed to update finance transaction in database");
        }
    }

    /**
     * Delete a finance transaction
     */
    async delete(transactionId: string): Promise<boolean> {
        try {
            const result = await db.deleteFrom("finance_transaction").where("id", "=", transactionId).execute();

            return !!result.length;
        } catch (error) {
            logger.error("Failed to delete finance transaction:", error);
            throw new Error("Failed to delete finance transaction from database");
        }
    }

    /**
     * Bulk insert multiple transactions
     */
    async bulkInsert(
        transactions: {
            financeStatementId: string;
            name: string;
            amount: number;
            currency: Currency;
            usdAmount: number;
            category: string;
            transactionDate?: Date;
        }[]
    ): Promise<number> {
        try {
            // Validate all categories
            transactions.forEach((transaction) => {
                this.validateCategory(transaction.category);
            });

            const transactionsWithTimestamps = transactions.map((transaction) => ({
                ...transaction,
                updatedAt: new Date()
            }));

            const result = await db.insertInto("finance_transaction").values(transactionsWithTimestamps).execute();

            return result.length;
        } catch (error) {
            logger.error("Failed to bulk insert finance transactions:", error);
            throw new Error("Failed to bulk insert finance transactions in database");
        }
    }

    /**
     * Helper method to validate that a category string matches the TransactionCategory enum
     */
    private validateCategory(category: string): void {
        TransactionCategoryEnum.parse(category);
    }
}

// Export a singleton instance
export const financeTransactionRepository = new FinanceTransactionRepository();
