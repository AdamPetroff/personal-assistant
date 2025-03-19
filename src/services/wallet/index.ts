import { WalletService } from "./walletService";
import { langchainService } from "../langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Export types
export * from "./types";

// Create and initialize wallet service
const walletService = new WalletService();

/**
 * Initialize wallet service with tools and integrations
 */
export function initWalletService(): WalletService {
    // Create a LangChain tool for wallet balance
    const walletBalanceTool = tool(
        async () => {
            const walletData = await walletService.getAllWalletsValueUsd();
            return walletService.formatWalletReport(walletData);
        },
        {
            name: "get_wallet_balance",
            description: "Get your crypto wallet balances across different blockchains",
            schema: z.object({})
        }
    );

    // Create a LangChain tool for total crypto holdings
    const totalCryptoHoldingsTool = tool(
        async () => {
            const { formattedReport } = await walletService.getTotalCryptoHoldings();
            return formattedReport;
        },
        {
            name: "get_total_crypto_holdings",
            description: "Get a summary of your total cryptocurrency holdings including Binance",
            schema: z.object({})
        }
    );

    // Register the tools with LangChain service
    langchainService.registerTools([walletBalanceTool, totalCryptoHoldingsTool]);

    // Register the total holdings capability
    registerTotalCryptoHoldingsIntent(() => walletService.getTotalCryptoHoldings());

    return walletService;
}

function registerTotalCryptoHoldingsIntent(
    getTotalHoldingsFunction: () => Promise<{ totalUsd: number; formattedReport: string }>
) {
    // Create and register LangChain tool
    const totalCryptoHoldingsTool = tool(
        async () => {
            const { formattedReport } = await getTotalHoldingsFunction();
            return formattedReport;
        },
        {
            name: "get_total_crypto_holdings",
            description: "Get the total value of all your crypto holdings (Binance + wallets)",
            schema: z.object({})
        }
    );

    // Register with LangChain service
    langchainService.registerTools([totalCryptoHoldingsTool]);
}

// Export the wallet service singleton
export { walletService };
