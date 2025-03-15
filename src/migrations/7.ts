import { Kysely, sql } from "kysely";

/**
 * Adds currency column to finance_source table
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Create Currency enum type
    await sql`CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'CZK')`.execute(db);

    // Add currency column to finance_source table with default value USD
    await db.schema
        .alterTable("finance_source")
        .addColumn("currency", sql`"Currency"`, (col) => col.notNull().defaultTo("USD"))
        .execute();
}

/**
 * Removes currency column from finance_source table
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Remove the currency column
    await db.schema.alterTable("finance_source").dropColumn("currency").execute();

    // Drop the Currency enum type
    await sql`DROP TYPE IF EXISTS "Currency"`.execute(db);
}
