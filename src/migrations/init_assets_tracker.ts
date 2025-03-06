import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    // Create Asset table
    await db.schema
        .createTable("asset")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("name", "text", (col) => col.notNull())
        .addColumn("symbol", "text", (col) => col.notNull())
        .addColumn("type", "text", (col) => col.notNull()) // 'crypto', 'stock', 'other'
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute();

    // Create AssetValue table
    await db.schema
        .createTable("assetValue")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("assetId", "uuid", (col) => 
            col.notNull().references("asset.id").onDelete("cascade")
        )
        .addColumn("value", "decimal", (col) => col.notNull())
        .addColumn("currency", "text", (col) => col.notNull().defaultTo("USD"))
        .addColumn("timestamp", "timestamp(3)", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addUniqueConstraint("assetValue_assetId_timestamp_unique", ["assetId", "timestamp"])
        .execute();

    // Create PortfolioSnapshot table
    await db.schema
        .createTable("portfolioSnapshot")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("totalValue", "decimal", (col) => col.notNull())
        .addColumn("currency", "text", (col) => col.notNull().defaultTo("USD"))
        .addColumn("timestamp", "timestamp(3)", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop tables in reverse order
    await db.schema.dropTable("portfolioSnapshot").execute();
    await db.schema.dropTable("assetValue").execute();
    await db.schema.dropTable("asset").execute();
}
