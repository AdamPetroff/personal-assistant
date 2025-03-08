import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    // Create BlockchainNetwork enum type
    await sql`CREATE TYPE "BlockchainNetwork" AS ENUM (
        'ethereum', 'bsc', 'polygon', 'solana', 
        'arbitrum', 'optimism', 'avalanche', 'base'
    )`.execute(db);

    // Create Wallet table
    await db.schema
        .createTable("wallet")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("address", "text", (col) => col.notNull())
        .addColumn("network", sql`"BlockchainNetwork"`, (col) => col.notNull())
        .addColumn("label", "text")
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute();

    // Add a unique constraint to prevent duplicate wallets
    await db.schema
        .createIndex("wallet_address_network_unique")
        .on("wallet")
        .columns(["address", "network"])
        .unique()
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop table and enum
    await db.schema.dropTable("wallet").execute();
    await sql`DROP TYPE IF EXISTS "BlockchainNetwork"`.execute(db);
}
