import { financeSourceRepository } from "../database/repositories/FinanceSourceRepository";
import { getChartService } from "./chartService";
import { logger } from "../../utils/logger";
import { tool } from "@langchain/core/tools";
import { langchainService } from "../langchain";
import { z } from "zod";
import { generatePortfolioSummaryMessage } from "../../bot/schedulers/portfolioSummaryMessage";
import { TgReadyToolResponse } from "../../bot/handlers/messageHandlers";

/**
 * Generate a finance chart showing balances over time
 * @param options Options for chart generation
 * @returns Path to the generated chart image
 */
export async function generateFinanceChart(options: {
    startDate?: Date;
    endDate?: Date;
    title?: string;
    showIndividualSources?: boolean;
    width?: number;
    height?: number;
}): Promise<string> {
    try {
        // Get the finance data from repository
        const chartData = await financeSourceRepository.getFinanceChartData(options.startDate, options.endDate);

        if (chartData.length === 0) {
            throw new Error("No finance data available for charting");
        }

        // Get chart service and generate the chart
        const chartService = getChartService();

        const chartPath = await chartService.generateFinanceLineChart(chartData, {
            title: options.title || "Finance Account Balances Over Time",
            showIndividualSources: options.showIndividualSources,
            width: options.width,
            height: options.height
        });

        return chartPath;
    } catch (error) {
        logger.error("Failed to generate finance chart:", error);
        throw new Error("Failed to generate finance chart");
    }
}

function registerTotalPortfolioWorthIntent() {
    // Create and register LangChain tool
    const totalWorthTool = tool(
        async () => {
            const summaryResult = await generatePortfolioSummaryMessage();
            return (
                summaryResult
                    ? {
                          text: summaryResult.text,
                          image: summaryResult.imageBuffer
                      }
                    : {
                          text: "No portfolio summary available"
                      }
            ) as TgReadyToolResponse;
        },
        {
            name: "get_portfolio_worth",
            description: "Get the total value of your financial portfolio (crypto + finance)",
            schema: z.object({})
        }
    );

    // Register with LangChain service
    langchainService.registerTools([totalWorthTool]);
}

export function initFinanceChartService() {
    registerTotalPortfolioWorthIntent();
}
