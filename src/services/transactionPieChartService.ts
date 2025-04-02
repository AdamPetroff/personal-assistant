import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { env } from "../config/constants";
import { TransactionCategoryEnum } from "../utils/revolut-statement-schema";

// Define a Transaction type based on the revolut statement schema
export interface Transaction {
    date: Date;
    description: string;
    amount: {
        amount: number;
        currency: string;
    };
    // Assuming category is one of the enums in TransactionCategoryEnum
    category: (typeof TransactionCategoryEnum._def.values)[number];
}

export class TransactionPieChartService {
    constructor() {
        // In a real implementation, dependency injection for a transactions repository can be done here.
    }

    // This is a stub for fetching transactions from a specified date range.
    // In production, replace this with actual database/API calls.
    async fetchTransactions(startDate: Date, endDate: Date): Promise<Transaction[]> {
        // TODO: Implement the actual fetching logic
        // For demo purposes, return an empty array or some dummy transactions
        return [];
    }

    // Generates a pie chart image buffer showing spending by category for transactions in the given date range.
    async generatePieChartReport(startDate: Date, endDate: Date): Promise<Buffer> {
        const transactions = await this.fetchTransactions(startDate, endDate);

        // Aggregate spending per category. Only consider transactions with negative amounts (spending).
        const spendingByCategory: Record<string, number> = {};
        // Initialize spendingByCategory with each category defined in TransactionCategoryEnum set to 0
        TransactionCategoryEnum.options.forEach((category: string) => {
            spendingByCategory[category] = 0;
        });

        // Sum up spending; assuming negative amounts represent spending.
        transactions.forEach((tx) => {
            if (tx.amount.amount < 0) {
                // Sum absolute spent amount
                spendingByCategory[tx.category] += Math.abs(tx.amount.amount);
            }
        });

        // Filter categories that have spending > 0
        const labels = Object.keys(spendingByCategory).filter((category) => spendingByCategory[category] > 0);
        const data = labels.map((category) => spendingByCategory[category]);

        // Define chart dimensions from env variables, with defaults if not set.
        const width = Number((env as any).CHART_WIDTH) || 800;
        const height = Number((env as any).CHART_HEIGHT) || 600;

        // Create an instance of ChartJSNodeCanvas
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

        // Define a set of colors for the pie chart slices.
        const backgroundColors = [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#C9CBCF",
            "#E7E9ED",
            "#74D3AE",
            "#F78181",
            "#A1CAF1",
            "#BBBADA"
        ];

        // Configure the chart
        const configuration = {
            type: "pie",
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: backgroundColors.slice(0, labels.length)
                    }
                ]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: "Spending by Category"
                    }
                }
            }
        };

        // Render chart to image buffer
        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        return imageBuffer;
    }
}
