import { Kysely, sql } from "kysely";

/**
 * Alters the crypto_portfolio_report table to rename columns from snake_case to camelCase
 * to match the TypeScript type definitions
 */
export async function up(db: Kysely<any>): Promise<void> {
    // Rename the columns to match the TypeScript interfaces
    await db.schema.alterTable("crypto_portfolio_report").renameColumn("total_value_usd", "totalValueUsd").execute();

    await db.schema
        .alterTable("crypto_portfolio_report")
        .renameColumn("wallets_value_usd", "walletsValueUsd")
        .execute();

    await db.schema
        .alterTable("crypto_portfolio_report")
        .renameColumn("exchange_value_usd", "exchangeValueUsd")
        .execute();

    await db.schema.alterTable("crypto_portfolio_report").renameColumn("created_at", "createdAt").execute();
}

/**
 * Reverts the column renames, going back to snake_case
 */
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable("crypto_portfolio_report").renameColumn("totalValueUsd", "total_value_usd").execute();

    await db.schema
        .alterTable("crypto_portfolio_report")
        .renameColumn("walletsValueUsd", "wallets_value_usd")
        .execute();

    await db.schema
        .alterTable("crypto_portfolio_report")
        .renameColumn("exchangeValueUsd", "exchange_value_usd")
        .execute();

    await db.schema.alterTable("crypto_portfolio_report").renameColumn("createdAt", "created_at").execute();
}
