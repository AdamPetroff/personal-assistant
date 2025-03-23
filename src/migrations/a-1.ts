import { Kysely, sql } from "kysely";

/**
 * Adds transactionDate column to finance_transaction table
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Add transactionDate column to finance_transaction table
    await db.schema
        .alterTable("finance_transaction")
        .addColumn("transactionDate", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .execute();
}

/**
 * Removes transactionDate column from finance_transaction table
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Remove the transactionDate column
    await db.schema.alterTable("finance_transaction").dropColumn("transactionDate").execute();
}
