/**
 * This script migrates wallet addresses from environment variables
 * and hardcoded lists to the database.
 */
import { db } from "../../services/database/database";
import { WalletRepository } from "../../services/database/repositories/WalletRepository";
import { BlockchainNetwork } from "../../services/blockchain-types";

// Sample hardcoded wallet list from the old implementation
const hardcodedWallets = [
    {
        address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
        network: BlockchainNetwork.BSC,
        label: "trezor"
    },
    {
        address: "0x7f44f6E49346538cfD8fFaAd3c60407f069BE4f5",
        network: BlockchainNetwork.BASE,
        label: "trezor"
    },
    {
        address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
        network: BlockchainNetwork.ETHEREUM,
        label: "work"
    },
    {
        address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
        network: BlockchainNetwork.BSC,
        label: "work"
    },
    {
        address: "0xCA4996676cF26914c06b558E8D81933F75a99357",
        network: BlockchainNetwork.POLYGON,
        label: "work"
    }
];

async function migrateWallets() {
    try {
        console.log("Starting wallet migration...");
        const walletRepository = new WalletRepository();

        // Migrate wallets from environment variables
        const walletEnvVars = Object.keys(process.env)
            .filter((key) => key.startsWith("WALLET_"))
            .map((key) => ({ key, value: process.env[key] }));

        console.log(`Found ${walletEnvVars.length} wallet(s) in environment variables`);

        for (const { key, value } of walletEnvVars) {
            if (!value) continue;

            // Format: WALLET_NETWORK_LABEL=address
            const parts = key.split("_");
            if (parts.length < 3) continue;

            const network = parts[1].toLowerCase() as BlockchainNetwork;
            const label = parts.slice(2).join("_").toLowerCase();

            try {
                // Check if wallet already exists in database
                const existingWallet = await walletRepository.getByAddressAndNetwork(value, network);

                if (!existingWallet) {
                    await walletRepository.create({
                        address: value,
                        network,
                        label
                    });
                    console.log(`Added wallet from env: ${value} (${network}, ${label})`);
                } else {
                    console.log(`Wallet already exists in database: ${value} (${network})`);
                }
            } catch (error) {
                console.error(`Error migrating wallet from env: ${value} (${network})`, error);
            }
        }

        // Migrate hardcoded wallets
        console.log(`Migrating ${hardcodedWallets.length} hardcoded wallets`);

        for (const wallet of hardcodedWallets) {
            try {
                // Check if wallet already exists in database
                const existingWallet = await walletRepository.getByAddressAndNetwork(wallet.address, wallet.network);

                if (!existingWallet) {
                    await walletRepository.create({
                        address: wallet.address,
                        network: wallet.network,
                        label: wallet.label
                    });
                    console.log(`Added hardcoded wallet: ${wallet.address} (${wallet.network}, ${wallet.label})`);
                } else {
                    console.log(`Hardcoded wallet already exists in database: ${wallet.address} (${wallet.network})`);
                }
            } catch (error) {
                console.error(`Error migrating hardcoded wallet: ${wallet.address} (${wallet.network})`, error);
            }
        }

        console.log("Wallet migration completed successfully");
    } catch (error) {
        console.error("Error during wallet migration:", error);
    } finally {
        await db.destroy();
    }
}

// Execute the migration
migrateWallets();
