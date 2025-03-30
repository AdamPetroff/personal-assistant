import { Kysely, sql } from "kysely";

/**
 * Creates the transaction_category table to store historical transaction categories
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Create transaction_category table
    await db.schema
        .createTable("transaction_category")
        .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn("transactionId", "uuid", (col) =>
            col.notNull().references("finance_transaction.id").onDelete("cascade")
        )
        .addColumn("transactionName", "varchar", (col) => col.notNull())
        .addColumn("category", "varchar", (col) => col.notNull())
        .addColumn("createdAt", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
        .execute();

    // Create index on transactionId for faster lookups
    await db.schema
        .createIndex("transaction_category_transaction_id_idx")
        .on("transaction_category")
        .column("transactionId")
        .execute();
}

/**
 * Drops the transaction_category table
 */
export async function down(db: Kysely<any>): Promise<void> {
    // Drop the transaction_category table
    await db.schema.dropTable("transaction_category").execute();
}
