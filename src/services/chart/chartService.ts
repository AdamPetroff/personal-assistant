import { createCanvas } from "canvas";
import { PortfolioChartDataPoint } from "../database/repositories/CryptoPortfolioRepository";
import { FinanceChartDataPoint } from "../database/repositories/FinanceSourceRepository";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";

/**
 * Union type for chart data sources
 */
export type ChartDataSource = "crypto" | "finance" | "combined";

/**
 * Unified chart data point interface
 */
export interface UnifiedChartDataPoint {
    timestamp: Date;
    cryptoData?: {
        totalValueUsd: number;
        walletsValueUsd: number;
        exchangeValueUsd: number;
    };
    financeData?: {
        totalBalance: number;
        sourceBalances: {
            sourceId: string;
            sourceName: string;
            sourceType: string;
            balance: number;
        }[];
    };
}

/**
 * Service for generating chart images
 */
export class ChartService {
    /**
     * Generate a line chart image for portfolio data
     * @param data The portfolio chart data points
     * @param options Options for chart generation
     * @returns Path to the generated image file
     */
    async generateCryptoPortfolioLineChart(
        data: PortfolioChartDataPoint[],
        options: {
            width?: number;
            height?: number;
            title?: string;
            outputPath?: string;
            fileName?: string;
        } = {}
    ): Promise<string> {
        try {
            if (data.length === 0) {
                throw new Error("No data points provided for chart generation");
            }

            // Sort data by timestamp to ensure chronological order
            data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Set defaults
            const width = options.width || 800;
            const height = options.height || 400;
            const title = options.title || "Crypto Portfolio Value Over Time";
            const outputPath = options.outputPath || "uploads/charts";
            const fileName = options.fileName || `portfolio-chart-${Date.now()}.png`;

            // Create output directory if it doesn't exist
            const fullOutputPath = path.resolve(outputPath);
            if (!fs.existsSync(fullOutputPath)) {
                fs.mkdirSync(fullOutputPath, { recursive: true });
            }

            // Create canvas and context
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // Set background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);

            // Chart margins and dimensions
            const margin = { top: 60, right: 50, bottom: 60, left: 70 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            // Find min and max values for scaling
            const allValues = data.flatMap((d) => [
                Number(d.totalValueUsd),
                Number(d.walletsValueUsd),
                Number(d.exchangeValueUsd)
            ]);
            const maxValue = Math.max(...allValues) * 1.1; // Add 10% padding
            const minValue = 0; // Start from zero for better visualization

            // Draw chart title
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(title, width / 2, margin.top / 2);

            // Draw axes
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;

            // Y-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, margin.top);
            ctx.lineTo(margin.left, height - margin.bottom);
            ctx.stroke();

            // X-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, height - margin.bottom);
            ctx.lineTo(width - margin.right, height - margin.bottom);
            ctx.stroke();

            // Draw y-axis labels and grid lines
            const yTickCount = 5;
            ctx.textAlign = "right";
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";

            for (let i = 0; i <= yTickCount; i++) {
                const value = minValue + ((maxValue - minValue) * (yTickCount - i)) / yTickCount;
                const y = margin.top + (i / yTickCount) * chartHeight;

                // Grid line
                ctx.strokeStyle = "#e0e0e0";
                ctx.beginPath();
                ctx.moveTo(margin.left, y);
                ctx.lineTo(width - margin.right, y);
                ctx.stroke();

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(
                    "$" +
                        value.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        }),
                    margin.left - 10,
                    y + 4
                );
            }

            // Draw x-axis labels (dates)
            const xLabelCount = Math.min(data.length, 8); // Limit to prevent crowding
            const xLabelInterval = Math.ceil(data.length / xLabelCount);

            ctx.textAlign = "center";
            ctx.fillStyle = "black";

            for (let i = 0; i < data.length; i += xLabelInterval) {
                const point = data[i];
                const x = margin.left + (i / (data.length - 1)) * chartWidth;
                const date = new Date(point.timestamp);
                const label = date.toLocaleDateString();

                // Label
                ctx.fillText(label, x, height - margin.bottom + 20);

                // Tick mark
                ctx.strokeStyle = "black";
                ctx.beginPath();
                ctx.moveTo(x, height - margin.bottom);
                ctx.lineTo(x, height - margin.bottom + 5);
                ctx.stroke();
            }

            // Draw data lines
            const drawLine = (dataPoints: number[], color: string, lineWidth: number) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();

                for (let i = 0; i < data.length; i++) {
                    const value = dataPoints[i];
                    const x = margin.left + (i / (data.length - 1)) * chartWidth;
                    const y = margin.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            };

            // Draw each line series
            const totalValues = data.map((d) => Number(d.totalValueUsd));
            const walletValues = data.map((d) => Number(d.walletsValueUsd));
            const exchangeValues = data.map((d) => Number(d.exchangeValueUsd));

            drawLine(totalValues, "rgba(75, 192, 192, 1)", 2);
            drawLine(walletValues, "rgba(54, 162, 235, 1)", 2);
            drawLine(exchangeValues, "rgba(255, 99, 132, 1)", 2);

            // Draw the legend
            const legendItems = [
                { label: "Total Value", color: "rgba(75, 192, 192, 1)" },
                { label: "Wallet Value", color: "rgba(54, 162, 235, 1)" },
                { label: "Exchange Value", color: "rgba(255, 99, 132, 1)" }
            ];

            const legendX = width / 2 - 150;
            const legendY = height - margin.bottom / 2;
            const itemWidth = 100;

            ctx.textAlign = "left";
            ctx.font = "12px Arial";

            legendItems.forEach((item, i) => {
                const x = legendX + i * itemWidth;

                // Color box
                ctx.fillStyle = item.color;
                ctx.fillRect(x, legendY - 8, 10, 10);

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(item.label, x + 15, legendY);
            });

            // Save the chart to a file
            const filePath = path.join(fullOutputPath, fileName);
            const buffer = canvas.toBuffer("image/png");
            fs.writeFileSync(filePath, buffer);

            logger.info(`Chart generated and saved to: ${filePath}`);
            return filePath;
        } catch (error) {
            logger.error("Failed to generate chart:", error);
            throw new Error("Failed to generate portfolio chart image");
        }
    }

    /**
     * Generate a line chart image for finance data
     * @param data The finance chart data points
     * @param options Options for chart generation
     * @returns Path to the generated image file
     */
    async generateFinanceLineChart(
        data: FinanceChartDataPoint[],
        options: {
            width?: number;
            height?: number;
            title?: string;
            outputPath?: string;
            fileName?: string;
            showIndividualSources?: boolean;
        } = {}
    ): Promise<string> {
        try {
            if (data.length === 0) {
                throw new Error("No data points provided for chart generation");
            }

            // Sort data by timestamp to ensure chronological order
            data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Set defaults
            const width = options.width || 800;
            const height = options.height || 400;
            const title = options.title || "Finance Account Balances Over Time";
            const outputPath = options.outputPath || "uploads/charts";
            const fileName = options.fileName || `finance-chart-${Date.now()}.png`;
            const showIndividualSources = options.showIndividualSources ?? false;

            // Create output directory if it doesn't exist
            const fullOutputPath = path.resolve(outputPath);
            if (!fs.existsSync(fullOutputPath)) {
                fs.mkdirSync(fullOutputPath, { recursive: true });
            }

            // Create canvas and context
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // Set background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);

            // Chart margins and dimensions
            const margin = { top: 60, right: 50, bottom: 60, left: 70 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            // Find min and max values for scaling
            let maxValue = Math.max(...data.map((d) => d.totalBalance)) * 1.1; // Add 10% padding
            const minValue = 0; // Start from zero for better visualization

            // Draw chart title
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(title, width / 2, margin.top / 2);

            // Draw axes
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;

            // Y-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, margin.top);
            ctx.lineTo(margin.left, height - margin.bottom);
            ctx.stroke();

            // X-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, height - margin.bottom);
            ctx.lineTo(width - margin.right, height - margin.bottom);
            ctx.stroke();

            // Draw y-axis labels and grid lines
            const yTickCount = 5;
            ctx.textAlign = "right";
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";

            for (let i = 0; i <= yTickCount; i++) {
                const value = minValue + ((maxValue - minValue) * (yTickCount - i)) / yTickCount;
                const y = margin.top + (i / yTickCount) * chartHeight;

                // Grid line
                ctx.strokeStyle = "#e0e0e0";
                ctx.beginPath();
                ctx.moveTo(margin.left, y);
                ctx.lineTo(width - margin.right, y);
                ctx.stroke();

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(
                    "$" +
                        value.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        }),
                    margin.left - 10,
                    y + 4
                );
            }

            // Draw x-axis labels (dates)
            const xLabelCount = Math.min(data.length, 8); // Limit to prevent crowding
            const xLabelInterval = Math.ceil(data.length / xLabelCount);

            ctx.textAlign = "center";
            ctx.fillStyle = "black";

            for (let i = 0; i < data.length; i += xLabelInterval) {
                const point = data[i];
                const x = margin.left + (i / (data.length - 1)) * chartWidth;
                const date = new Date(point.timestamp);
                const label = date.toLocaleDateString();

                // Label
                ctx.fillText(label, x, height - margin.bottom + 20);

                // Tick mark
                ctx.strokeStyle = "black";
                ctx.beginPath();
                ctx.moveTo(x, height - margin.bottom);
                ctx.lineTo(x, height - margin.bottom + 5);
                ctx.stroke();
            }

            // Draw data lines
            const drawLine = (dataPoints: number[], color: string, lineWidth: number) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();

                for (let i = 0; i < dataPoints.length; i++) {
                    const value = dataPoints[i];
                    const x = margin.left + (i / (dataPoints.length - 1)) * chartWidth;
                    const y = margin.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            };

            // Draw total balance line
            const totalBalances = data.map((d) => d.totalBalance);
            drawLine(totalBalances, "rgba(75, 192, 192, 1)", 2);

            // Legend items starting with total
            const legendItems = [{ label: "Total Balance", color: "rgba(75, 192, 192, 1)" }];

            // If we should show individual sources
            if (showIndividualSources) {
                // Get all unique sources across all data points
                const allSources = new Map<string, { name: string; type: string }>();

                data.forEach((dataPoint) => {
                    dataPoint.sourceBalances.forEach((source) => {
                        if (!allSources.has(source.sourceId)) {
                            allSources.set(source.sourceId, {
                                name: source.sourceName,
                                type: source.sourceType
                            });
                        }
                    });
                });

                // Define colors for each source (up to 10 different sources)
                const sourceColors = [
                    "rgba(54, 162, 235, 1)", // Blue
                    "rgba(255, 99, 132, 1)", // Red
                    "rgba(255, 206, 86, 1)", // Yellow
                    "rgba(75, 192, 192, 1)", // Teal
                    "rgba(153, 102, 255, 1)", // Purple
                    "rgba(255, 159, 64, 1)", // Orange
                    "rgba(199, 199, 199, 1)", // Gray
                    "rgba(83, 102, 255, 1)", // Blue-purple
                    "rgba(255, 99, 255, 1)", // Pink
                    "rgba(159, 159, 64, 1)" // Olive
                ];

                // Draw a line for each source
                let colorIndex = 0;
                for (const [sourceId, sourceInfo] of allSources.entries()) {
                    // Get the color for this source
                    const color = sourceColors[colorIndex % sourceColors.length];
                    colorIndex++;

                    // Create data points for this source
                    const sourceDataPoints = data.map((dataPoint) => {
                        const sourceBalance = dataPoint.sourceBalances.find((s) => s.sourceId === sourceId);
                        return sourceBalance ? sourceBalance.balance : 0;
                    });

                    // Draw the line
                    drawLine(sourceDataPoints, color, 1.5);

                    // Add to legend
                    legendItems.push({
                        label: sourceInfo.name,
                        color: color
                    });
                }
            }

            // Draw the legend
            const legendX = width / 2 - legendItems.length * 50;
            const legendY = height - margin.bottom / 2;
            const itemWidth = 120;

            ctx.textAlign = "left";
            ctx.font = "12px Arial";

            legendItems.forEach((item, i) => {
                const x = legendX + i * itemWidth;

                // Color box
                ctx.fillStyle = item.color;
                ctx.fillRect(x, legendY - 8, 10, 10);

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(item.label, x + 15, legendY);
            });

            // Save the chart to a file
            const filePath = path.join(fullOutputPath, fileName);
            const buffer = canvas.toBuffer("image/png");
            fs.writeFileSync(filePath, buffer);

            logger.info(`Finance chart generated and saved to: ${filePath}`);
            return filePath;
        } catch (error) {
            logger.error("Failed to generate finance chart:", error);
            throw new Error("Failed to generate finance chart image");
        }
    }

    /**
     * Generate a unified chart showing both crypto and finance data
     * @param data The unified chart data points
     * @param options Options for chart generation
     * @returns Path to the generated image file
     */
    async generateUnifiedChart(
        data: UnifiedChartDataPoint[],
        options: {
            width?: number;
            height?: number;
            title?: string;
            fileName?: string;
            showCrypto?: boolean;
            showFinance?: boolean;
            showIndividualSources?: boolean;
            sources?: ChartDataSource[];
        } = {}
    ): Promise<Buffer> {
        try {
            if (data.length === 0) {
                throw new Error("No data points provided for chart generation");
            }

            // Sort data by timestamp to ensure chronological order
            data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Set defaults
            const width = options.width || 1000;
            const height = options.height || 500;
            const title = options.title || "Asset Overview";
            const showCrypto = options.showCrypto !== undefined ? options.showCrypto : true;
            const showFinance = options.showFinance !== undefined ? options.showFinance : true;
            const showIndividualSources = options.showIndividualSources ?? false;

            // Create canvas and context
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // Set background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);

            // Chart margins and dimensions
            const margin = { top: 60, right: 80, bottom: 80, left: 80 };
            const chartWidth = width - margin.left - margin.right;
            const chartHeight = height - margin.top - margin.bottom;

            // Find min and max values for scaling
            let maxValue = 0;

            // Process crypto data if available
            if (showCrypto) {
                const cryptoValues = data.flatMap((d) => (d.cryptoData ? [Number(d.cryptoData.totalValueUsd)] : []));
                if (cryptoValues.length > 0) {
                    maxValue = Math.max(maxValue, ...cryptoValues);
                }
            }

            // Process finance data if available
            if (showFinance) {
                const financeValues = data.flatMap((d) => (d.financeData ? [Number(d.financeData.totalBalance)] : []));
                if (financeValues.length > 0) {
                    maxValue = Math.max(maxValue, ...financeValues);
                }
            }

            // Add 10% padding to the max value
            maxValue = maxValue * 1.1;
            const minValue = 0; // Start from zero for better visualization

            // Draw chart title
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(title, width / 2, margin.top / 2);

            // Draw axes
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;

            // Y-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, margin.top);
            ctx.lineTo(margin.left, height - margin.bottom);
            ctx.stroke();

            // X-axis
            ctx.beginPath();
            ctx.moveTo(margin.left, height - margin.bottom);
            ctx.lineTo(width - margin.right, height - margin.bottom);
            ctx.stroke();

            // Draw y-axis labels and grid lines
            const yTickCount = 5;
            ctx.textAlign = "right";
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";

            for (let i = 0; i <= yTickCount; i++) {
                const value = minValue + ((maxValue - minValue) * (yTickCount - i)) / yTickCount;
                const y = margin.top + (i / yTickCount) * chartHeight;

                // Grid line
                ctx.strokeStyle = "#e0e0e0";
                ctx.beginPath();
                ctx.moveTo(margin.left, y);
                ctx.lineTo(width - margin.right, y);
                ctx.stroke();

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(
                    "$" +
                        value.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        }),
                    margin.left - 10,
                    y + 4
                );
            }

            // Draw x-axis labels (dates)
            const xLabelCount = Math.min(data.length, 8); // Limit to prevent crowding
            const xLabelInterval = Math.ceil(data.length / xLabelCount);

            ctx.textAlign = "center";
            ctx.fillStyle = "black";

            for (let i = 0; i < data.length; i += xLabelInterval) {
                const point = data[i];
                const x = margin.left + (i / (data.length - 1)) * chartWidth;
                const date = new Date(point.timestamp);
                const label = date.toLocaleDateString();

                // Label
                ctx.fillText(label, x, height - margin.bottom + 20);

                // Tick mark
                ctx.strokeStyle = "black";
                ctx.beginPath();
                ctx.moveTo(x, height - margin.bottom);
                ctx.lineTo(x, height - margin.bottom + 5);
                ctx.stroke();
            }

            // Draw data lines
            const drawLine = (dataPoints: number[], color: string, lineWidth: number) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();

                for (let i = 0; i < dataPoints.length; i++) {
                    const value = dataPoints[i];
                    const x = margin.left + (i / (dataPoints.length - 1)) * chartWidth;
                    const y = margin.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            };

            // Initialize legend items array
            const legendItems: { label: string; color: string }[] = [];

            // Draw crypto data lines if available and requested
            if (showCrypto) {
                const cryptoTotalValues = data.map((d) => (d.cryptoData ? Number(d.cryptoData.totalValueUsd) : 0));
                const cryptoWalletValues = data.map((d) => (d.cryptoData ? Number(d.cryptoData.walletsValueUsd) : 0));
                const cryptoExchangeValues = data.map((d) =>
                    d.cryptoData ? Number(d.cryptoData.exchangeValueUsd) : 0
                );

                // Only draw if we have valid data
                if (cryptoTotalValues.some((v) => v > 0)) {
                    drawLine(cryptoTotalValues, "rgba(75, 192, 192, 1)", 2);
                    legendItems.push({ label: "Crypto Total", color: "rgba(75, 192, 192, 1)" });

                    if (showIndividualSources) {
                        drawLine(cryptoWalletValues, "rgba(54, 162, 235, 1)", 2);
                        drawLine(cryptoExchangeValues, "rgba(255, 99, 132, 1)", 2);

                        legendItems.push({ label: "Crypto Wallets", color: "rgba(54, 162, 235, 1)" });
                        legendItems.push({ label: "Crypto Exchanges", color: "rgba(255, 99, 132, 1)" });
                    }
                }
            }

            // Draw finance data lines if available and requested
            if (showFinance) {
                const financeTotalValues = data.map((d) => (d.financeData ? Number(d.financeData.totalBalance) : 0));

                // Only draw if we have valid data
                if (financeTotalValues.some((v) => v > 0)) {
                    drawLine(financeTotalValues, "rgba(153, 102, 255, 1)", 2);
                    legendItems.push({ label: "Finance Total", color: "rgba(153, 102, 255, 1)" });

                    // Add individual finance sources if requested
                    if (showIndividualSources) {
                        // Get all unique sources across all data points
                        const allSources = new Map<string, { name: string; type: string }>();

                        data.forEach((dataPoint) => {
                            if (dataPoint.financeData) {
                                dataPoint.financeData.sourceBalances.forEach((source) => {
                                    if (!allSources.has(source.sourceId)) {
                                        allSources.set(source.sourceId, {
                                            name: source.sourceName,
                                            type: source.sourceType
                                        });
                                    }
                                });
                            }
                        });

                        // Define colors for each source
                        const sourceColors = [
                            "rgba(255, 206, 86, 1)", // Yellow
                            "rgba(255, 159, 64, 1)", // Orange
                            "rgba(199, 199, 199, 1)", // Gray
                            "rgba(83, 102, 255, 1)", // Blue-purple
                            "rgba(255, 99, 255, 1)", // Pink
                            "rgba(159, 159, 64, 1)" // Olive
                        ];

                        // Draw a line for each source
                        let colorIndex = 0;
                        for (const [sourceId, sourceInfo] of allSources.entries()) {
                            // Get the color for this source
                            const color = sourceColors[colorIndex % sourceColors.length];
                            colorIndex++;

                            // Create data points for this source
                            const sourceDataPoints = data.map((dataPoint) => {
                                if (!dataPoint.financeData) return 0;
                                const sourceBalance = dataPoint.financeData.sourceBalances.find(
                                    (s) => s.sourceId === sourceId
                                );
                                return sourceBalance ? sourceBalance.balance : 0;
                            });

                            // Draw the line
                            drawLine(sourceDataPoints, color, 1.5);

                            // Add to legend
                            legendItems.push({
                                label: sourceInfo.name,
                                color: color
                            });
                        }
                    }
                }
            }

            // Draw the legend
            const legendX = width / 2 - legendItems.length * 60;
            const legendY = height - margin.bottom / 2 + 20;
            const itemWidth = 120;

            ctx.textAlign = "left";
            ctx.font = "12px Arial";

            legendItems.forEach((item, i) => {
                const x = legendX + i * itemWidth;

                // Color box
                ctx.fillStyle = item.color;
                ctx.fillRect(x, legendY - 8, 10, 10);

                // Label
                ctx.fillStyle = "black";
                ctx.fillText(item.label, x + 15, legendY);
            });

            const buffer = canvas.toBuffer("image/png");
            return buffer;
        } catch (error) {
            logger.error("Failed to generate unified chart:", error);
            throw new Error("Failed to generate unified chart image");
        }
    }
}

// Singleton instance
let chartServiceInstance: ChartService | null = null;

/**
 * Get the chart service instance
 */
export function getChartService(): ChartService {
    if (!chartServiceInstance) {
        chartServiceInstance = new ChartService();
    }
    return chartServiceInstance;
}
