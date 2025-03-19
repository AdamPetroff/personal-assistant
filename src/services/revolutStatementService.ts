import { Stream } from "stream";
import { z } from "zod";
import { logger } from "../utils/logger";
import { langchainService } from "./langchain";
import { exchangeRateService } from "./exchangeRate";
import { RevolutStatementSchema, RevolutStatement, TransactionCategory } from "../utils/revolut-statement-schema";
import { financeSourceRepository } from "./database/repositories/FinanceSourceRepository";
import { financeTransactionRepository } from "./database/repositories/FinanceTransactionRepository";
import BigNumber from "bignumber.js";
import { Currency } from "./database/db";

/**
 * Service for processing and saving Revolut statements
 */
export class RevolutStatementService {
    async processStatementPdfFile(fileStream: Stream) {
        // Extract data from the PDF
        const { revolutStatement, summary } = await this.extractDataFromPDF(fileStream);

        // Process the statement to add USD amounts
        const processedStatement = await revolutStatementService.processStatement(revolutStatement);

        // Find or create a finance source for Revolut
        let financeSourceId;
        try {
            financeSourceId = await findOrCreateRevolutSource(
                revolutStatement.accountHolder.name,
                revolutStatement.accountHolder.accountNumber
            );
        } catch (sourceError) {
            logger.error("Failed to get Revolut source, creating generic source:", sourceError);
            // Create a generic finance source as fallback
            const fallbackSource = await financeSourceRepository.create(
                "Revolut Account",
                "REVOLUT",
                undefined,
                "Fallback Revolut source",
                revolutStatement.balanceSummary.closingBalance.currency as Currency
            );
            financeSourceId = fallbackSource.id;
        }

        // Save to database
        await this.saveToDatabase(financeSourceId, processedStatement);

        return summary;
    }

    /**
     * Process a screenshot of a Revolut statement and extract the EUR balance
     * @param fileStream The image file stream
     * @returns Summary of the processed statement
     */
    async processStatementScreenshot(fileStream: Stream): Promise<string> {
        try {
            // Extract data from the screenshot
            const extractedData = await langchainService.extractDataFromImage(
                fileStream,
                z.object({
                    totalBalance: z.number().describe("The total balance shown in the account"),
                    currency: z.string().describe("The currency code")
                }),
                `Extract the total balance and currency from the account in this Revolut statement screenshot.`
            );

            // Validate that we got EUR data
            if (extractedData.currency.toUpperCase() !== "EUR") {
                // If the extracted currency is not EUR, we need to convert it
                const convertedAmount = await exchangeRateService.convertCurrency(
                    extractedData.totalBalance,
                    extractedData.currency,
                    "EUR"
                );
                extractedData.totalBalance = convertedAmount.toNumber();
                extractedData.currency = "EUR";
            }

            // Create a simplified statement object
            const currentDate = new Date();
            const revolutStatement: RevolutStatement = {
                documentType: "EUR Statement",
                accountHolder: {
                    name: "Revolut Account Holder"
                },
                period: {
                    from: new Date(currentDate.setDate(currentDate.getDate() - 30)), // Assume last 30 days
                    to: new Date()
                },
                balanceSummary: {
                    openingBalance: {
                        amount: extractedData.totalBalance, // Use same for opening in screenshot case
                        currency: extractedData.currency
                    },
                    closingBalance: {
                        amount: extractedData.totalBalance,
                        currency: extractedData.currency
                    }
                },
                transactions: {
                    completed: [] // No transactions from screenshot
                }
            };

            // Process the statement to add USD amounts
            const processedStatement = await this.processStatement(revolutStatement);

            // Find or create a finance source for Revolut (EUR)
            const financeSourceId = await findOrCreateRevolutSource("Screenshot Import", undefined);

            // Save to database
            await this.saveToDatabase(financeSourceId, processedStatement, "screenshot_import");

            return `Successfully processed Revolut screenshot. Current balance: ${extractedData.totalBalance} ${extractedData.currency}`;
        } catch (error) {
            logger.error("Error processing Revolut statement screenshot:", error);
            throw new Error(`Failed to process Revolut statement screenshot: ${error}`);
        }
    }

    /**
     * Extract data from a Revolut statement PDF file
     * @param fileStream The PDF file stream
     * @returns The extracted data and a summary
     */
    async extractDataFromPDF(fileStream: Stream): Promise<{
        revolutStatement: RevolutStatement;
        summary: string;
    }> {
        try {
            return await langchainService.extractDataFromPDF(
                fileStream,
                z.object({
                    revolutStatement: RevolutStatementSchema,
                    summary: z
                        .string()
                        .describe(
                            "A summary of the bank statement. Describe the time period covered by the statement and the total balance at the start and end of the period. Mention the biggest transactions"
                        )
                })
            );
        } catch (error) {
            logger.error("Error extracting data from Revolut statement PDF:", error);
            throw new Error(`Failed to extract data from Revolut statement: ${error}`);
        }
    }

    /**
     * Process the Revolut statement data by adding USD amounts
     * @param statementData The extracted Revolut statement data
     * @returns The processed statement with USD amounts
     */
    async processStatement(statementData: RevolutStatement): Promise<
        RevolutStatement & {
            usdAmounts: {
                openingBalanceUsd: number;
                closingBalanceUsd: number;
                transactions: {
                    completed: Array<{ id: string; amountUsd: number }>;
                    pending?: Array<{ id: string; amountUsd: number }>;
                };
            };
        }
    > {
        try {
            // Convert opening and closing balances to USD
            const openingBalanceUsd = await this.convertToUsd(
                statementData.balanceSummary.openingBalance.amount,
                statementData.balanceSummary.openingBalance.currency
            );

            const closingBalanceUsd = await this.convertToUsd(
                statementData.balanceSummary.closingBalance.amount,
                statementData.balanceSummary.closingBalance.currency
            );

            // Process completed transactions
            const completedTransactions = await Promise.all(
                statementData.transactions.completed.map(async (transaction, index) => {
                    const amountUsd = await this.convertToUsd(transaction.amount.amount, transaction.amount.currency);

                    return {
                        id: index.toString(), // Generate an ID for referencing
                        amountUsd
                    };
                })
            );

            // Process pending transactions if they exist
            let pendingTransactions: Array<{ id: string; amountUsd: number }> | undefined;

            if (statementData.transactions.pending && statementData.transactions.pending.length > 0) {
                pendingTransactions = await Promise.all(
                    statementData.transactions.pending.map(async (transaction, index) => {
                        const amountUsd = await this.convertToUsd(
                            transaction.amount.amount,
                            transaction.amount.currency
                        );

                        return {
                            id: `p${index}`, // Generate an ID with 'p' prefix to distinguish from completed
                            amountUsd
                        };
                    })
                );
            }

            // Return the processed statement with USD amounts
            return {
                ...statementData,
                usdAmounts: {
                    openingBalanceUsd,
                    closingBalanceUsd,
                    transactions: {
                        completed: completedTransactions,
                        pending: pendingTransactions
                    }
                }
            };
        } catch (error) {
            logger.error("Error processing Revolut statement:", error);
            throw new Error(`Failed to process Revolut statement: ${error}`);
        }
    }

    /**
     * Save the processed statement to the database
     * @param financeSourceId The ID of the finance source
     * @param processedStatement The processed statement with USD amounts
     * @param fileName Optional filename of the original statement
     * @returns The saved finance statement
     */
    async saveToDatabase(
        financeSourceId: string,
        processedStatement: RevolutStatement & {
            usdAmounts: {
                openingBalanceUsd: number;
                closingBalanceUsd: number;
                transactions: {
                    completed: Array<{ id: string; amountUsd: number }>;
                    pending?: Array<{ id: string; amountUsd: number }>;
                };
            };
        },
        fileName?: string
    ) {
        try {
            // Create statement data structure
            const statement = {
                accountBalance: processedStatement.balanceSummary.closingBalance.amount,
                accountBalanceUsd: processedStatement.usdAmounts.closingBalanceUsd,
                statementDate: processedStatement.period.to, // Use end date of the statement period
                data: processedStatement,
                fileName: fileName
            };

            // Save the statement to the database
            const savedStatement = await financeSourceRepository.saveStatement(financeSourceId, statement);

            // Prepare transactions for bulk insert
            const transactions = processedStatement.transactions.completed.map((transaction, index) => {
                return {
                    financeStatementId: savedStatement.id,
                    name: transaction.description,
                    amount: transaction.amount.amount,
                    currency: transaction.amount.currency as Currency,
                    usdAmount: processedStatement.usdAmounts.transactions.completed[index].amountUsd,
                    category: transaction.category as string,
                    createdAt: transaction.date
                };
            });

            // Add pending transactions if they exist
            if (processedStatement.transactions.pending && processedStatement.transactions.pending.length > 0) {
                const pendingTransactions = processedStatement.transactions.pending.map((transaction, index) => {
                    return {
                        financeStatementId: savedStatement.id,
                        name: `[PENDING] ${transaction.description}`,
                        amount: transaction.amount.amount,
                        currency: transaction.amount.currency as Currency,
                        usdAmount: processedStatement.usdAmounts.transactions.pending![index].amountUsd,
                        category: transaction.category as string,
                        createdAt: transaction.date
                    };
                });

                transactions.push(...pendingTransactions);
            }

            // Bulk insert transactions
            if (transactions.length > 0) {
                await financeTransactionRepository.bulkInsert(transactions);
            }

            return savedStatement;
        } catch (error) {
            logger.error("Error saving Revolut statement to database:", error);
            throw new Error(`Failed to save Revolut statement to database: ${error}`);
        }
    }

    /**
     * Helper method to convert an amount from one currency to USD
     */
    async convertToUsd(amount: number, currency: string): Promise<number> {
        if (currency.toUpperCase() === "USD") {
            return amount;
        }

        try {
            const convertedAmount = await exchangeRateService.convertCurrency(amount, currency, "USD");
            return convertedAmount.toNumber();
        } catch (error) {
            logger.error(`Failed to convert ${currency} to USD:`, error);
            // Fall back to original amount if conversion fails
            return amount;
        }
    }
}

// Export singleton instance
export const revolutStatementService = new RevolutStatementService();

/**
 * Find or create a Revolut finance source
 */
async function findOrCreateRevolutSource(accountHolder?: string, accountNumber?: string): Promise<string> {
    try {
        // Try to find an existing Revolut source
        const allSources = await financeSourceRepository.getAll();
        const revolutSource = allSources.find(
            (source) => source.type === "REVOLUT" || source.name.toLowerCase().includes("revolut")
        );

        if (revolutSource) {
            return revolutSource.id;
        }

        // Create a new Revolut source if none exists
        const newSource = await financeSourceRepository.create(
            accountHolder ? `Revolut - ${accountHolder}` : "Revolut Account",
            "REVOLUT",
            accountNumber || undefined,
            "Automatically created from Revolut statement upload",
            "EUR" // Default currency for Revolut, can be updated later
        );

        return newSource.id;
    } catch (error) {
        logger.error("Error finding or creating Revolut source:", error);
        throw new Error("Failed to find or create Revolut source");
    }
}
