import { createCanvas } from "canvas";
import { PortfolioChartDataPoint } from "../database/repositories/CryptoPortfolioRepository";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";

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
    async generatePortfolioLineChart(
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
