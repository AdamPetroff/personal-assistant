import { TokenBalance, WalletReport, WalletWithValue } from "./types";
import { BlockchainNetwork } from "../blockchain-types";
import { binanceService } from "../binance";
import { logger } from "../../utils/logger";

export class WalletReportService {
    /**
     * Format wallet holdings report
     */
    formatWalletReport(walletData: WalletReport): string {
        const formatCurrency = (value: number) =>
            value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Minimum USD value to show in reports
        const minUsdValueToShow = 10;

        let report = `💰 *Wallet Holdings Report* 💰\n\n`;
        report += `*Total Value*: $${formatCurrency(walletData.totalValueUsd)}\n\n`;

        for (const wallet of walletData.wallets) {
            const walletLabel = wallet.label ? `${wallet.label} (${wallet.network})` : `${wallet.network}`;
            const shortAddress = `${wallet.address.substring(0, 6)}...${wallet.address.substring(wallet.address.length - 4)}`;

            report += `*${walletLabel}* - ${shortAddress}\n`;
            report += `*Value*: $${formatCurrency(wallet.valueUsd)}\n`;

            // Sort tokens by USD value (highest first) and filter out low-value tokens
            const sortedTokens = [...wallet.tokenBalances]
                .filter((token) => (token.valueUsd || 0) >= minUsdValueToShow)
                .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

            if (sortedTokens.length > 0) {
                report += `*Top Holdings*:\n`;

                // Show top 5 tokens by value
                for (let i = 0; i < Math.min(5, sortedTokens.length); i++) {
                    const token = sortedTokens[i];
                    const valueStr = token.valueUsd ? `$${formatCurrency(token.valueUsd)}` : "Unknown value";

                    report += `  • ${token.balance.toFormat(4)} _${token.symbol}_ (${valueStr})\n`;
                }

                // If there are more tokens, show a summary
                if (sortedTokens.length > 5) {
                    const remainingValue = sortedTokens.slice(5).reduce((sum, token) => sum + (token.valueUsd || 0), 0);
                    report += `  • Plus ${sortedTokens.length - 5} more tokens ($${formatCurrency(remainingValue)})\n`;
                }

                // If there are low-value tokens that were filtered out, mention them
                const lowValueTokens = wallet.tokenBalances.filter(
                    (token) => (token.valueUsd || 0) < minUsdValueToShow && (token.valueUsd || 0) > 0
                );
                if (lowValueTokens.length > 0) {
                    const lowValueTotal = lowValueTokens.reduce((sum, token) => sum + (token.valueUsd || 0), 0);
                    report += `  • ${lowValueTokens.length} low-value tokens not shown ($${formatCurrency(lowValueTotal)})\n`;
                }
            } else {
                // Check if there are any tokens at all
                const anyTokens = wallet.tokenBalances.some((token) => (token.valueUsd || 0) > 0);
                if (anyTokens) {
                    report += `Only low-value tokens (< $${minUsdValueToShow}) found.\n`;
                } else {
                    report += `No token balances found.\n`;
                }
            }

            report += `\n`;
        }

        report += `_Generated at: ${new Date().toLocaleString()}_`;
        return report;
    }

    /**
     * Generate a total crypto holdings report including Binance balances
     */
    async generateTotalHoldingsReport(
        walletData: WalletReport
    ): Promise<{ totalUsd: number; formattedReport: string }> {
        try {
            // Minimum USD value to show in reports
            const minUsdValueToShow = 10;

            // Get wallet holdings
            const walletTotalUsd = walletData.totalValueUsd;

            // Get Binance holdings
            let binanceTotalUsd = 0;
            try {
                const binanceInstance = binanceService();
                binanceTotalUsd = await binanceInstance.getTotalBalanceUsd();
            } catch (error) {
                logger.warn("Could not fetch Binance balance:", error);
                // Continue without Binance data
            }

            // Calculate total
            const totalUsd = walletTotalUsd + binanceTotalUsd;

            // Format report
            let report = `*Total Crypto Holdings*\n\n`;
            report += `*Total Value:* $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

            // Add wallet breakdown
            report += `*Wallet Holdings:* $${walletTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

            // Filter wallets to only show those with significant value
            const significantWallets = walletData.wallets.filter((wallet) => wallet.valueUsd >= minUsdValueToShow);
            const lowValueWallets = walletData.wallets.filter(
                (wallet) => wallet.valueUsd > 0 && wallet.valueUsd < minUsdValueToShow
            );

            // Show significant wallets
            for (const wallet of significantWallets) {
                report += `• ${wallet.label || wallet.address.substring(0, 8)}... (${wallet.network}): $${wallet.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            }

            // Mention low-value wallets if any
            if (lowValueWallets.length > 0) {
                const lowValueTotal = lowValueWallets.reduce((sum, wallet) => sum + wallet.valueUsd, 0);
                report += `• ${lowValueWallets.length} low-value wallets not shown: $${lowValueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            }

            // Add Binance breakdown
            report += `\n*Binance Holdings:* $${binanceTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

            return { totalUsd, formattedReport: report };
        } catch (error) {
            logger.error("Failed to generate total crypto holdings report:", error);
            throw new Error("Failed to generate total crypto holdings report");
        }
    }
}
