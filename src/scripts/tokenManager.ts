#!/usr/bin/env node

import { Command } from "commander";
import { TokenService } from "../services/wallet/tokenService";
import { BlockchainNetwork } from "../services/blockchain-types";
import { testConnection } from "../services/database/client";
import { logger } from "../utils/logger";

const program = new Command();
const tokenService = new TokenService();

// Initialize the program
program.name("token-manager").description("CLI tool for managing tokens in the database").version("1.0.0");

// List all tokens
program
    .command("list")
    .description("List all tokens")
    .action(async () => {
        try {
            await ensureDbConnection();
            const tokens = await tokenService.getAllTokens();
            console.table(tokens);
            process.exit(0);
        } catch (error) {
            handleError("Error listing tokens", error);
        }
    });

// List tokens by network
program
    .command("list-network")
    .description("List tokens by network")
    .argument("<network>", "Blockchain network")
    .action(async (network: string) => {
        try {
            await ensureDbConnection();
            validateNetwork(network);
            const tokens = await tokenService.getTokensByNetwork(network as BlockchainNetwork);
            console.table(tokens);
            process.exit(0);
        } catch (error) {
            handleError("Error listing tokens by network", error);
        }
    });

// Add a new token
program
    .command("add")
    .description("Add a new token")
    .requiredOption("-a, --address <address>", "Contract address")
    .requiredOption("-n, --network <network>", "Blockchain network")
    .requiredOption("-s, --symbol <symbol>", "Token symbol")
    .requiredOption("-m, --name <name>", "Token name")
    .requiredOption("-d, --decimals <decimals>", "Token decimals", parseInt)
    .action(async (options: { address: string; network: string; symbol: string; name: string; decimals: number }) => {
        try {
            await ensureDbConnection();
            validateNetwork(options.network);

            const token = await tokenService.addToken({
                contractAddress: options.address,
                network: options.network as BlockchainNetwork,
                symbol: options.symbol,
                name: options.name,
                decimals: options.decimals
            });

            console.log("Token added successfully:");
            console.table(token);
            process.exit(0);
        } catch (error) {
            handleError("Error adding token", error);
        }
    });

// Update a token
program
    .command("update")
    .description("Update an existing token")
    .argument("<id>", "Token ID")
    .option("-a, --address <address>", "Contract address")
    .option("-n, --network <network>", "Blockchain network")
    .option("-s, --symbol <symbol>", "Token symbol")
    .option("-m, --name <name>", "Token name")
    .option("-d, --decimals <decimals>", "Token decimals", parseInt)
    .action(
        async (
            id: string,
            options: {
                address?: string;
                network?: string;
                symbol?: string;
                name?: string;
                decimals?: number;
            }
        ) => {
            try {
                await ensureDbConnection();

                if (options.network) {
                    validateNetwork(options.network);
                }

                const token = await tokenService.updateToken(id, {
                    contractAddress: options.address,
                    network: options.network as BlockchainNetwork | undefined,
                    symbol: options.symbol,
                    name: options.name,
                    decimals: options.decimals
                });

                console.log("Token updated successfully:");
                console.table(token);
                process.exit(0);
            } catch (error) {
                handleError("Error updating token", error);
            }
        }
    );

// Delete a token
program
    .command("delete")
    .description("Delete a token")
    .argument("<id>", "Token ID")
    .action(async (id: string) => {
        try {
            await ensureDbConnection();
            const success = await tokenService.deleteToken(id);

            if (success) {
                console.log(`Token with ID ${id} deleted successfully`);
            } else {
                console.error(`Token with ID ${id} not found`);
                process.exit(1);
            }

            process.exit(0);
        } catch (error) {
            handleError("Error deleting token", error);
        }
    });

// Helper function to ensure database connection
async function ensureDbConnection(): Promise<void> {
    const connected = await testConnection();
    if (!connected) {
        console.error("Failed to connect to the database");
        process.exit(1);
    }
}

// Helper function to validate network
function validateNetwork(network: string): void {
    if (!Object.values(BlockchainNetwork).includes(network as BlockchainNetwork)) {
        console.error(`Invalid network: ${network}`);
        console.log(`Valid networks: ${Object.values(BlockchainNetwork).join(", ")}`);
        process.exit(1);
    }
}

// Helper function to handle errors
function handleError(message: string, error: unknown): void {
    logger.error(message, error);
    console.error(message);
    if (error instanceof Error) {
        console.error(error.message);
    }
    process.exit(1);
}

// Parse command line arguments
program.parse(process.argv);
