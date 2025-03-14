import { Kysely, sql } from "kysely";

/**
 * Creates tables for storing finance sources (banks/investment platforms) and
 * finance statements (bank statements, portfolio reports)
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Create finance_source table
    await db.schema
        .createTable("finance_source")
        .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn("name", "varchar", (col) => col.notNull())
        .addColumn("type", "varchar", (col) => col.notNull())
        .addColumn("accountNumber", "varchar")
        .addColumn("description", "text")
        .addColumn("createdAt", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
        .addColumn("updatedAt", "timestamp", (col) => col.notNull())
        .execute();

    // Create finance_statement table
    await db.schema
        .createTable("finance_statement")
        .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn("financeSourceId", "uuid", (col) =>
            col.notNull().references("finance_source.id").onDelete("cascade")
        )
        .addColumn("accountBalance", "numeric", (col) => col.notNull())
        .addColumn("statementDate", "timestamp", (col) => col.notNull())
        .addColumn("data", "jsonb", (col) => col.notNull())
        .addColumn("fileName", "varchar")
        .addColumn("createdAt", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
        .addColumn("updatedAt", "timestamp", (col) => col.notNull())
        .execute();

    // Add index on financeSourceId for faster lookups
    await db.schema
        .createIndex("idx_finance_statement_source_id")
        .on("finance_statement")
        .column("financeSourceId")
        .execute();

    // Add index on statementDate for faster sorting
    await db.schema.createIndex("idx_finance_statement_date").on("finance_statement").column("statementDate").execute();
}

/**
 * Drops the finance tables
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Drop the tables in reverse order of their dependencies
    await db.schema.dropTable("finance_statement").ifExists().execute();
    await db.schema.dropTable("finance_source").ifExists().execute();
}
