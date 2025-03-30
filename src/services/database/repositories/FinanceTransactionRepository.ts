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
    async getByCategory(categoryName: TransactionCategory): Promise<FinanceTransactionModel[]> {
        try {
            // Validate category
            this.validateCategory(categoryName);

            const results = await db
                .selectFrom("finance_transaction")
                .selectAll()
                .where("category", "=", categoryName)
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
    async updateCategory(transactionId: string, categoryName: TransactionCategory): Promise<FinanceTransactionModel> {
        try {
            // Validate category
            this.validateCategory(categoryName);

            // Get the transaction to retrieve its name
            const transaction = await db
                .selectFrom("finance_transaction")
                .select(["name"])
                .where("id", "=", transactionId)
                .executeTakeFirstOrThrow();

            // Start a transaction to ensure both operations succeed or fail together
            return await db.transaction().execute(async (trx) => {
                // 1. Update the category in finance_transaction table
                const result = await trx
                    .updateTable("finance_transaction")
                    .set({
                        category: categoryName,
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

                // 2. Create record in transaction_category table
                await trx
                    .insertInto("transaction_category")
                    .values({
                        transactionId,
                        transactionName: transaction.name,
                        category: categoryName
                    })
                    .execute();

                return {
                    ...result,
                    amount: Number(result.amount),
                    usdAmount: Number(result.usdAmount)
                } as FinanceTransactionModel;
            });
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

    /**
     * Get all transaction category mappings
     * Returns an array of transaction name and category pairs
     */
    async getAllTransactionCategories(): Promise<Array<{ name: string; category: string }>> {
        try {
            const results = await db
                .selectFrom("transaction_category")
                .select(["transactionName as name", "category"])
                .orderBy("transactionName", "asc")
                .execute();

            return results as Array<{ name: string; category: string }>;
        } catch (error) {
            logger.error("Failed to fetch transaction categories:", error);
            throw new Error("Failed to fetch transaction categories from database");
        }
    }
}

// Export a singleton instance
export const financeTransactionRepository = new FinanceTransactionRepository();
