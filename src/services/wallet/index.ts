import { WalletService } from "./walletService";
import { WalletBalanceService } from "./balanceService";
import { WalletReportService } from "./reportService";
import { registerTotalCryptoHoldingsIntent } from "../openai";
import { langchainService } from "../langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../../utils/logger";

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

// Export the wallet service singleton
export { walletService };
