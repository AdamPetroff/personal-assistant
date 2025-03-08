import { Kysely, sql } from "kysely";

/**
 * Creates the crypto_portfolio_report table to store historical portfolio reports
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Create the crypto_portfolio_report table
    await db.schema
        .createTable("crypto_portfolio_report")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("timestamp", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn("totalValueUsd", "numeric", (col) => col.notNull())
        .addColumn("walletsValueUsd", "numeric", (col) => col.notNull())
        .addColumn("exchangeValueUsd", "numeric", (col) => col.notNull())
        .addColumn("data", "jsonb", (col) => col.notNull()) // Detailed report data in JSON format
        .addColumn("createdAt", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    // Create index on timestamp for efficient querying
    await db.schema
        .createIndex("crypto_portfolio_report_timestamp_idx")
        .on("crypto_portfolio_report")
        .column("timestamp")
        .execute();
}

/**
 * Drops the crypto_portfolio_report table
 */
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("crypto_portfolio_report").execute();
}
