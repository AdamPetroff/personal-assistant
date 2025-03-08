import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    // Create Token table
    await db.schema
        .createTable("token")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("contractAddress", "text", (col) => col.notNull())
        .addColumn("network", sql`"BlockchainNetwork"`, (col) => col.notNull())
        .addColumn("symbol", "text", (col) => col.notNull())
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("decimals", "integer", (col) => col.notNull())
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute();

    // Add a unique constraint to prevent duplicate tokens
    await db.schema
        .createIndex("token_address_network_unique")
        .on("token")
        .columns(["contractAddress", "network"])
        .unique()
        .execute();

    // Insert initial tokens from the hardcoded list
    await db
        .insertInto("token")
        .values([
            {
                contractAddress: "0x82a605D6D9114F4Ad6D5Ee461027477EeED31E34",
                network: "ethereum",
                symbol: "SNSY",
                name: "Sensay",
                decimals: 18
            },
            {
                contractAddress: "0x55d398326f99059fF775485246999027B3197955",
                network: "bsc",
                symbol: "USDT",
                name: "Tether",
                decimals: 18
            },
            {
                contractAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
                network: "base",
                symbol: "USDT",
                name: "Tether",
                decimals: 6
            },
            {
                contractAddress: "0x50CE4129Ca261CCDe4EB100c170843c2936Bc11b",
                network: "base",
                symbol: "KOLZ",
                name: "Kolz",
                decimals: 18
            }
        ])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop table
    await db.schema.dropTable("token").execute();
}
