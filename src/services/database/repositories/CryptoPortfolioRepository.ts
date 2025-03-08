import { db } from "../client";
import { sql } from "kysely";
import { DB } from "../db";

/**
 * Interface for crypto portfolio report data
 */
export interface CryptoPortfolioReportData {
    totalValueUsd: number;
    walletsValueUsd: number;
    exchangeValueUsd: number;
    data: any; // Detailed portfolio data in JSON format
    timestamp?: Date; // Optional: Will use current time if not provided
}

/**
 * Interface for crypto portfolio report with ID and timestamps
 */
export interface CryptoPortfolioReportEntry extends CryptoPortfolioReportData {
    id: string;
    timestamp: Date;
    createdAt: Date;
}

/**
 * Interface for chart data point
 */
export interface PortfolioChartDataPoint {
    timestamp: Date;
    totalValueUsd: number;
    walletsValueUsd: number;
    exchangeValueUsd: number;
}

/**
 * Repository for managing crypto portfolio reports
 */
export class CryptoPortfolioRepository {
    /**
     * Save a new crypto portfolio report
     */
    async save(report: CryptoPortfolioReportData): Promise<string> {
        const result = await db
            .insertInto("crypto_portfolio_report")
            .values({
                totalValueUsd: report.totalValueUsd,
                walletsValueUsd: report.walletsValueUsd,
                exchangeValueUsd: report.exchangeValueUsd,
                data: JSON.stringify(report.data),
                timestamp: report.timestamp ? sql`${report.timestamp}` : sql`now()`
            })
            .returning("id")
            .executeTakeFirstOrThrow();

        return result.id;
    }

    /**
     * Get a report by ID
     */
    async getById(id: string): Promise<CryptoPortfolioReportEntry | null> {
        const result = await db
            .selectFrom("crypto_portfolio_report")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

        if (!result) return null;

        return this.mapDatabaseRecord(result);
    }

    /**
     * Get the latest report
     */
    async getLatest(): Promise<CryptoPortfolioReportEntry | null> {
        const result = await db
            .selectFrom("crypto_portfolio_report")
            .selectAll()
            .orderBy("timestamp", "desc")
            .limit(1)
            .executeTakeFirst();

        if (!result) return null;

        return this.mapDatabaseRecord(result);
    }

    /**
     * Get reports for a specific date range
     */
    async getByDateRange(startDate: Date, endDate: Date, limit = 100): Promise<CryptoPortfolioReportEntry[]> {
        const results = await db
            .selectFrom("crypto_portfolio_report")
            .selectAll()
            .where("timestamp", ">=", startDate)
            .where("timestamp", "<=", endDate)
            .orderBy("timestamp", "desc")
            .limit(limit)
            .execute();

        return results.map(this.mapDatabaseRecord);
    }

    /**
     * Get data for portfolio value chart
     */
    async getChartData(startDate: Date, endDate: Date, limit = 100): Promise<PortfolioChartDataPoint[]> {
        const results = await db
            .selectFrom("crypto_portfolio_report")
            .select(["timestamp", "totalValueUsd", "walletsValueUsd", "exchangeValueUsd"])
            .where("timestamp", ">=", startDate)
            .where("timestamp", "<=", endDate)
            .orderBy("timestamp", "asc")
            .limit(limit)
            .execute();

        return results.map((r) => ({
            timestamp: new Date(r.timestamp),
            totalValueUsd: Number(r.totalValueUsd),
            walletsValueUsd: Number(r.walletsValueUsd),
            exchangeValueUsd: Number(r.exchangeValueUsd)
        }));
    }

    /**
     * Delete reports older than a specific date
     */
    async deleteOlderThan(date: Date): Promise<number> {
        const result = await db.deleteFrom("crypto_portfolio_report").where("timestamp", "<", date).executeTakeFirst();

        return Number(result.numDeletedRows) || 0;
    }

    /**
     * Map database record to repository model
     */
    private mapDatabaseRecord(record: any): CryptoPortfolioReportEntry {
        return {
            id: record.id,
            totalValueUsd: Number(record.totalValueUsd),
            walletsValueUsd: Number(record.walletsValueUsd),
            exchangeValueUsd: Number(record.exchangeValueUsd),
            data: typeof record.data === "string" ? JSON.parse(record.data) : record.data,
            timestamp: new Date(record.timestamp),
            createdAt: new Date(record.createdAt)
        };
    }
}
