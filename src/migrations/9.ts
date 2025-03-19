import { Kysely, sql } from "kysely";

/**
 * Creates the finance_transaction table
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Create finance_transaction table
    await db.schema
        .createTable("finance_transaction")
        .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn("financeStatementId", "uuid", (col) =>
            col.notNull().references("finance_statement.id").onDelete("cascade")
        )
        .addColumn("name", "varchar", (col) => col.notNull())
        .addColumn("amount", "numeric", (col) => col.notNull())
        .addColumn("currency", sql`"Currency"`, (col) => col.notNull())
        .addColumn("usdAmount", "numeric", (col) => col.notNull())
        .addColumn("category", "varchar", (col) => col.notNull())
        .addColumn("createdAt", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .addColumn("updatedAt", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    // Create index on financeStatementId for faster lookups
    await db.schema
        .createIndex("finance_transaction_statement_id_idx")
        .on("finance_transaction")
        .column("financeStatementId")
        .execute();
}

/**
 * Drops the finance_transaction table
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Drop the finance_transaction table
    await db.schema.dropTable("finance_transaction").execute();
}
