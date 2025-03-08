# Wallet Database Migration

This document describes the migration of wallet addresses from hardcoded values and environment variables to the database.

## Changes Made

1. Created a new `wallet` table in the database with the following columns:

    - `id`: UUID (primary key)
    - `address`: Text (wallet address)
    - `network`: Enum (blockchain network)
    - `label`: Text (optional label/name for the wallet)
    - `createdAt`: Timestamp
    - `updatedAt`: Timestamp

2. Added a unique constraint on `address` and `network` to prevent duplicate wallets.

3. Created a `WalletRepository` class for database operations:

    - Create, update, delete wallet records
    - Query wallets by id, address, network, and get all wallets

4. Updated the `WalletService` class to:

    - Load wallets from the database on initialization
    - Continue supporting loading wallets from environment variables, but now saving them to the database
    - Add asynchronous methods for adding and removing wallets with database operations

5. Created a migration script to transfer existing wallets to the database.

## Migration Steps

### 1. Run the Database Migration

The database migration adds the new wallet table and schema:

```bash
npm run migrate:up
```

### 2. Run the Wallet Migration Script

This script migrates existing wallets from environment variables and previously hardcoded values to the database:

```bash
# Compile TypeScript files
npm run build

# Run the migration script
node dist/migrations/scripts/migrateWallets.js
```

## Using the New Wallet System

The WalletService API remains largely the same, with a few key differences:

1. The `addWallet` and `removeWallet` methods are now asynchronous and return Promises.

2. Wallets are now loaded from the database at startup, so no code changes are needed to retrieve them.

3. Environment variables for wallets (in the format `WALLET_NETWORK_LABEL=address`) still work, but they are now used as a backup and are saved to the database on first load.

## Example Usage

```typescript
import { walletService } from "./services/wallet";
import { BlockchainNetwork } from "./services/wallet";

// Adding a wallet (now async)
await walletService.addWallet("0x1234567890abcdef1234567890abcdef12345678", BlockchainNetwork.ETHEREUM, "my_wallet");

// Removing a wallet (now async)
await walletService.removeWallet("0x1234567890abcdef1234567890abcdef12345678", BlockchainNetwork.ETHEREUM);

// Getting wallet balances (remains the same)
const balances = await walletService.fetchTokenBalances(
    "0x1234567890abcdef1234567890abcdef12345678",
    BlockchainNetwork.ETHEREUM
);
```

## Migration Validation

After running the migration, you can validate that all wallets were transferred correctly:

1. Check that all wallets appear in the database:

    ```sql
    SELECT * FROM wallet;
    ```

2. Verify that the application loads all wallets from the database by checking logs or running:
    ```typescript
    console.log(walletService.getWallets());
    ```
