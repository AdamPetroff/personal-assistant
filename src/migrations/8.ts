import { Kysely, sql } from "kysely";

/**
 * Adds accountBalanceUsd column to finance_statement table
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Add accountBalanceUsd column to finance_statement table (initially nullable)
    await db.schema.alterTable("finance_statement").addColumn("accountBalanceUsd", "numeric").execute();

    // Update all existing records to set accountBalanceUsd equal to accountBalance
    await db
        .updateTable("finance_statement")
        .set({ accountBalanceUsd: sql`"accountBalance"` })
        .execute();

    // Now make the column non-nullable
    await db.schema
        .alterTable("finance_statement")
        .alterColumn("accountBalanceUsd", (col) => col.setNotNull())
        .execute();
}

/**
 * Removes accountBalanceUsd column from finance_statement table
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Remove the accountBalanceUsd column
    await db.schema.alterTable("finance_statement").dropColumn("accountBalanceUsd").execute();
}
