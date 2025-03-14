import { db } from "../client";
import { logger } from "../../../utils/logger";

// Define a runtime finance source interface that matches the database shape
export interface FinanceSourceModel {
    id: string;
    name: string;
    type: string;
    accountNumber: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Define a runtime finance statement interface
export interface FinanceStatementModel {
    id: string;
    financeSourceId: string;
    accountBalance: number;
    statementDate: Date;
    data: any;
    fileName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class FinanceSourceRepository {
    /**
     * Creates a new finance source
     */
    async create(
        name: string,
        type: string,
        accountNumber?: string,
        description?: string
    ): Promise<FinanceSourceModel> {
        try {
            const newFinanceSource = {
                name,
                type,
                accountNumber: accountNumber || null,
                description: description || null,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("finance_source")
                .values(newFinanceSource)
                .returning(["id", "name", "type", "accountNumber", "description", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result as FinanceSourceModel;
        } catch (error) {
            logger.error("Failed to create finance source:", error);
            throw new Error("Failed to create finance source in database");
        }
    }

    /**
     * Get all finance sources
     */
    async getAll(): Promise<FinanceSourceModel[]> {
        try {
            const results = await db.selectFrom("finance_source").selectAll().orderBy("name", "asc").execute();

            return results as FinanceSourceModel[];
        } catch (error) {
            logger.error("Failed to fetch finance sources:", error);
            throw new Error("Failed to fetch finance sources from database");
        }
    }

    /**
     * Get a finance source by ID
     */
    async getById(sourceId: string): Promise<FinanceSourceModel | undefined> {
        try {
            const result = await db
                .selectFrom("finance_source")
                .selectAll()
                .where("id", "=", sourceId)
                .executeTakeFirst();

            return result as FinanceSourceModel | undefined;
        } catch (error) {
            logger.error("Failed to fetch finance source:", error);
            throw new Error("Failed to fetch finance source from database");
        }
    }

    /**
     * Update a finance source
     */
    async update(
        sourceId: string,
        updates: {
            name?: string;
            type?: string;
            accountNumber?: string | null;
            description?: string | null;
        }
    ): Promise<FinanceSourceModel> {
        try {
            const updateData = {
                ...updates,
                updatedAt: new Date()
            };

            const result = await db
                .updateTable("finance_source")
                .set(updateData)
                .where("id", "=", sourceId)
                .returning(["id", "name", "type", "accountNumber", "description", "createdAt", "updatedAt"])
                .executeTakeFirstOrThrow();

            return result as FinanceSourceModel;
        } catch (error) {
            logger.error("Failed to update finance source:", error);
            throw new Error("Failed to update finance source in database");
        }
    }

    /**
     * Delete a finance source
     */
    async delete(sourceId: string): Promise<boolean> {
        try {
            const result = await db.deleteFrom("finance_source").where("id", "=", sourceId).execute();

            return !!result.length;
        } catch (error) {
            logger.error("Failed to delete finance source:", error);
            throw new Error("Failed to delete finance source from database");
        }
    }

    /**
     * Save a finance statement
     */
    async saveStatement(
        financeSourceId: string,
        statement: {
            accountBalance: number;
            statementDate: Date;
            data: any;
            fileName?: string;
        }
    ): Promise<FinanceStatementModel> {
        try {
            const newStatement = {
                financeSourceId,
                accountBalance: statement.accountBalance,
                statementDate: statement.statementDate,
                data: statement.data,
                fileName: statement.fileName || null,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("finance_statement")
                .values(newStatement)
                .returning([
                    "id",
                    "financeSourceId",
                    "accountBalance",
                    "statementDate",
                    "fileName",
                    "createdAt",
                    "updatedAt"
                ])
                .executeTakeFirstOrThrow();

            return result as FinanceStatementModel;
        } catch (error) {
            logger.error("Failed to save finance statement:", error);
            throw new Error("Failed to save finance statement to database");
        }
    }

    /**
     * Get all statements for a finance source
     */
    async getStatementsBySourceId(sourceId: string): Promise<FinanceStatementModel[]> {
        try {
            const results = await db
                .selectFrom("finance_statement")
                .selectAll()
                .where("financeSourceId", "=", sourceId)
                .orderBy("statementDate", "desc")
                .execute();

            return results as FinanceStatementModel[];
        } catch (error) {
            logger.error("Failed to fetch finance statements:", error);
            throw new Error("Failed to fetch finance statements from database");
        }
    }

    /**
     * Get the latest statement for each finance source
     */
    async getLatestStatements(): Promise<(FinanceStatementModel & { sourceName: string; sourceType: string })[]> {
        try {
            // Get a list of all finance sources
            const sources = await this.getAll();

            // For each source, get the latest statement
            const statementPromises = sources.map(async (source) => {
                const statements = await db
                    .selectFrom("finance_statement")
                    .selectAll()
                    .where("financeSourceId", "=", source.id)
                    .orderBy("statementDate", "desc")
                    .limit(1)
                    .execute();

                if (statements.length === 0) {
                    return null;
                }

                return {
                    ...statements[0],
                    sourceName: source.name,
                    sourceType: source.type
                } as FinanceStatementModel & { sourceName: string; sourceType: string };
            });

            const results = await Promise.all(statementPromises);

            // Filter out nulls (sources with no statements)
            return results.filter((statement) => statement !== null) as (FinanceStatementModel & {
                sourceName: string;
                sourceType: string;
            })[];
        } catch (error) {
            logger.error("Failed to fetch latest finance statements:", error);
            throw new Error("Failed to fetch latest finance statements from database");
        }
    }

    /**
     * Get the total balance across all finance sources based on latest statements
     */
    async getTotalBalance(): Promise<number> {
        try {
            const latest = await this.getLatestStatements();
            return latest.reduce((sum, statement) => sum + statement.accountBalance, 0);
        } catch (error) {
            logger.error("Failed to calculate total finance balance:", error);
            throw new Error("Failed to calculate total finance balance");
        }
    }
}

// Export a singleton instance
export const financeSourceRepository = new FinanceSourceRepository();
