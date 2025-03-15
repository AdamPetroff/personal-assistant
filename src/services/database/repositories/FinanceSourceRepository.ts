import { db } from "../client";
import { logger } from "../../../utils/logger";
import { Currency } from "../db";
import { exchangeRateService } from "../../exchangeRate";
import BigNumber from "bignumber.js";

// Define a runtime finance source interface that matches the database shape
export interface FinanceSourceModel {
    id: string;
    name: string;
    type: string;
    accountNumber: string | null;
    description: string | null;
    currency: Currency;
    createdAt: Date;
    updatedAt: Date;
}

// Define a runtime finance statement interface
export interface FinanceStatementModel {
    id: string;
    financeSourceId: string;
    accountBalance: number;
    accountBalanceUsd: number;
    statementDate: Date;
    data: any;
    fileName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Define chart data interface for finance sources
export interface FinanceChartDataPoint {
    timestamp: Date;
    totalBalance: number;
    sourceBalances: {
        sourceId: string;
        sourceName: string;
        sourceType: string;
        balance: number;
    }[];
}

export class FinanceSourceRepository {
    /**
     * Creates a new finance source
     */
    async create(
        name: string,
        type: string,
        accountNumber?: string,
        description?: string,
        currency: Currency = "USD"
    ): Promise<FinanceSourceModel> {
        try {
            const newFinanceSource = {
                name,
                type,
                accountNumber: accountNumber || null,
                description: description || null,
                currency,
                updatedAt: new Date()
            };

            const result = await db
                .insertInto("finance_source")
                .values(newFinanceSource)
                .returning(["id", "name", "type", "accountNumber", "description", "currency", "createdAt", "updatedAt"])
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
            currency?: Currency;
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
                .returning(["id", "name", "type", "accountNumber", "description", "currency", "createdAt", "updatedAt"])
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
            accountBalanceUsd: number;
            statementDate: Date;
            data: any;
            fileName?: string;
        }
    ): Promise<FinanceStatementModel> {
        try {
            const newStatement = {
                financeSourceId,
                accountBalance: statement.accountBalance,
                accountBalanceUsd: statement.accountBalanceUsd,
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
                    "updatedAt",
                    "data"
                ])
                .executeTakeFirstOrThrow();

            return {
                ...result,
                accountBalance: Number(result.accountBalance),
                accountBalanceUsd: statement.accountBalanceUsd
            } as FinanceStatementModel;
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

            return results.map((result) => ({
                ...result,
                accountBalance: Number(result.accountBalance),
                accountBalanceUsd: Number(result.accountBalanceUsd || result.accountBalance)
            })) as FinanceStatementModel[];
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
                    sourceType: source.type,
                    accountBalance: Number(statements[0].accountBalance),
                    accountBalanceUsd: Number(statements[0].accountBalanceUsd || statements[0].accountBalance)
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

    /**
     * Get time-series data for all finance sources suitable for charting
     * @param startDate Optional start date to filter data
     * @param endDate Optional end date to filter data
     * @returns Array of data points organized by date
     */
    async getFinanceChartData(startDate?: Date, endDate?: Date): Promise<FinanceChartDataPoint[]> {
        try {
            // Get all finance sources
            const sources = await this.getAll();

            // Create a query to get all statements within the date range
            let query = db.selectFrom("finance_statement").selectAll();

            // Apply date filters if provided
            if (startDate) {
                query = query.where("statementDate", ">=", startDate);
            }

            if (endDate) {
                query = query.where("statementDate", "<=", endDate);
            }

            const result = await query.execute();

            // Execute the query
            const statements = result.map((result) => ({
                ...result,
                accountBalance: Number(result.accountBalance),
                accountBalanceUsd: Number(result.accountBalanceUsd)
            })) as FinanceStatementModel[];

            // If no statements found, return empty array
            if (!statements.length) {
                return [];
            }

            // Sort all statements by date
            statements.sort((a, b) => a.statementDate.getTime() - b.statementDate.getTime());

            // Group statements by date (using date string as key)
            const statementsByDate = new Map<string, FinanceStatementModel[]>();

            statements.forEach((statement) => {
                // Get date string (without time) for grouping
                const dateStr = statement.statementDate.toISOString().split("T")[0];

                if (!statementsByDate.has(dateStr)) {
                    statementsByDate.set(dateStr, []);
                }

                statementsByDate.get(dateStr)!.push(statement);
            });

            // Track the latest balance for each finance source
            const latestSourceBalances = new Map<string, number>();

            // Convert grouped statements to chart data points
            const chartDataPoints: FinanceChartDataPoint[] = [];

            // Get all date strings and sort them chronologically
            const dateStrings = Array.from(statementsByDate.keys()).sort();

            // Process each date
            for (const dateStr of dateStrings) {
                const dateStatements = statementsByDate.get(dateStr)!;

                // Update latest balances with statements from this date
                dateStatements.forEach((statement) => {
                    latestSourceBalances.set(statement.financeSourceId, Number(statement.accountBalanceUsd));
                });

                // Convert source balances to USD and create source balances array
                const sourceBalancesPromises = Array.from(latestSourceBalances.entries()).map(
                    async ([sourceId, balance]) => {
                        const source = sources.find((s) => s.id === sourceId);

                        if (!source) {
                            return {
                                sourceId,
                                sourceName: "Unknown Source",
                                sourceType: "Unknown Type",
                                balance
                            };
                        }

                        return {
                            sourceId,
                            sourceName: source.name || "Unknown Source",
                            sourceType: source.type || "Unknown Type",
                            balance
                        };
                    }
                );

                const sourceBalances = await Promise.all(sourceBalancesPromises);

                // Calculate total balance from all latest source balances
                const totalBalance = sourceBalances.reduce((sum, item) => sum + item.balance, 0);

                chartDataPoints.push({
                    timestamp: new Date(dateStr),
                    totalBalance,
                    sourceBalances
                });
            }

            return chartDataPoints;
        } catch (error) {
            logger.error("Failed to get finance chart data:", error);
            throw new Error("Failed to retrieve finance chart data from database");
        }
    }
}

// Export a singleton instance
export const financeSourceRepository = new FinanceSourceRepository();
