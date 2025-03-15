import { financeSourceRepository } from "../database/repositories/FinanceSourceRepository";
import { getChartService } from "./chartService";
import { logger } from "../../utils/logger";

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
