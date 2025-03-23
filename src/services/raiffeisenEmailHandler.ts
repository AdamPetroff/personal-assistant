import { logger } from "../utils/logger";
import { env } from "../config/constants";
import GmailService, { Email, EmailMetadata } from "./gmail";
import { FinanceSourceRepository } from "./database/repositories/FinanceSourceRepository";
import { financeTransactionRepository } from "./database/repositories/FinanceTransactionRepository";
import { LangchainService } from "./langchain";
import { exchangeRateService } from "./exchangeRate";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { TransactionCategory, TransactionCategoryEnum } from "../utils/revolut-statement-schema";

// Interface to represent parsed transaction data
interface RaiffeisenTransactionData {
    accountNumber: string;
    accountHolder: string;
    cardNumber?: string;
    transactionAmount: number;
    transactionDate: Date;
    transactionType: string;
    symbol?: string;
    merchantDetails?: string;
    remainingBalance: number;
    currency: string;
    category: TransactionCategory;
}

// Define the schema for transaction data extraction
const transactionSchema = z.object({
    accountNumber: z.string().describe("The account number (including bank code)"),
    accountHolder: z.string().describe("The account holder's name"),
    cardNumber: z.string().optional().describe("The card number if available"),
    transactionAmount: z.number().describe("The transaction amount (negative for withdrawals)"),
    transactionDate: z.string().describe("The transaction date and time in ISO format"),
    transactionType: z.string().describe("The type of transaction (e.g., 'Platba kartou' / Card payment)"),
    symbol: z.string().optional().describe("The transaction symbol or ID if available"),
    merchantDetails: z.string().optional().describe("The merchant details (e.g., 'HULK GYM; Brno; CZE')"),
    remainingBalance: z.number().describe("The remaining account balance after the transaction"),
    currency: z.string().describe("The currency code (usually CZK)"),
    category: TransactionCategoryEnum.describe(
        "The category of the transaction based on the merchant or transaction details"
    )
});

export class RaiffeisenEmailHandler {
    private langchainService: LangchainService;
    private financeSourceRepository: FinanceSourceRepository;
    private readonly RAIFFEISEN_EMAIL_SENDER = "info@rb.cz";
    private readonly FINANCE_SOURCE_TYPE = "bank_account";
    private readonly FINANCE_SOURCE_NAME = "Raiffeisen Bank";
    private extractTransactionTool: DynamicStructuredTool<typeof transactionSchema>;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required for email processing");
        }

        // Create a LangchainService instance with o3-mini for better extraction accuracy
        this.langchainService = LangchainService.createWithModel("o3-mini");
        this.financeSourceRepository = new FinanceSourceRepository();

        // Create the structured tool for extracting transaction data
        this.extractTransactionTool = new DynamicStructuredTool({
            name: "extractRaiffeisenTransaction",
            description: "Extract transaction details from a Raiffeisen Bank notification email",
            schema: transactionSchema,
            func: async (input: z.infer<typeof transactionSchema>) => {
                return input;
            }
        });
    }

    /**
     * Process all unread Raiffeisen Bank emails
     */
    public async processUnreadEmails(): Promise<number> {
        try {
            if (!GmailService.isConfigured()) {
                logger.error("Gmail service is not configured");
                throw new Error("Gmail service is not configured");
            }

            // Search for unread emails from Raiffeisen Bank
            const query = `is:unread from:${this.RAIFFEISEN_EMAIL_SENDER}`;
            const emails = await GmailService.listEmails(30, query);

            if (emails.length === 0) {
                logger.info("No unread Raiffeisen Bank emails found");
                return 0;
            }

            let processedCount = 0;

            // Process each email
            for (const emailMeta of emails) {
                try {
                    // Get full email content
                    const email = await GmailService.getEmail(emailMeta.id);

                    // Process the email
                    await this.processEmail(email);

                    // Mark email as read
                    await GmailService.markAsRead(email.id);

                    processedCount++;
                    logger.info(`Processed Raiffeisen Bank email: ${emailMeta.subject}`);
                } catch (error) {
                    logger.error(`Error processing email ${emailMeta.id}:`, error);
                    // Continue with next email
                }
            }

            return processedCount;
        } catch (error) {
            logger.error("Error processing Raiffeisen Bank emails:", error);
            throw new Error(`Failed to process Raiffeisen Bank emails: ${error}`);
        }
    }

    /**
     * Process a single Raiffeisen Bank email
     */
    private async processEmail(email: Email): Promise<void> {
        // Extract transaction data from the email content
        const transactionData = await this.extractTransactionData(email);

        // Get or create the finance source for Raiffeisen Bank
        const financeSource = await this.getOrCreateFinanceSource(transactionData.accountNumber);

        // Save the transaction data as a finance statement
        const savedStatement = await this.saveFinanceStatement(financeSource.id, transactionData);

        // Save the transaction data as a finance transaction
        await this.saveFinanceTransaction(savedStatement.id, transactionData);
    }

    /**
     * Save transaction data as a finance transaction
     */
    private async saveFinanceTransaction(
        financeStatementId: string,
        transactionData: RaiffeisenTransactionData
    ): Promise<void> {
        try {
            // Convert amount to USD if not already in USD
            let usdAmount = transactionData.transactionAmount;

            if (transactionData.currency !== "USD") {
                try {
                    const convertedAmount = await exchangeRateService.convertCurrency(
                        transactionData.transactionAmount,
                        transactionData.currency,
                        "USD"
                    );
                    usdAmount = convertedAmount.toNumber();
                } catch (error) {
                    logger.error(`Failed to convert ${transactionData.currency} to USD:`, error);
                    // Keep original amount if conversion fails
                }
            }

            // Create and save the finance transaction
            await financeTransactionRepository.create(
                financeStatementId,
                transactionData.merchantDetails || transactionData.transactionType,
                transactionData.transactionAmount,
                transactionData.currency as any, // Cast to Currency type
                usdAmount,
                transactionData.category // No need to convert to uppercase as it's already in the correct format
            );

            logger.info(`Saved finance transaction for statement ${financeStatementId}`);
        } catch (error) {
            logger.error("Error saving finance transaction:", error);
            throw new Error(`Failed to save finance transaction: ${error}`);
        }
    }

    /**
     * Save transaction data as a finance statement
     */
    private async saveFinanceStatement(financeSourceId: string, transactionData: RaiffeisenTransactionData) {
        try {
            // Get the finance source to determine its currency
            const financeSource = await this.financeSourceRepository.getById(financeSourceId);

            if (!financeSource) {
                throw new Error(`Finance source with ID ${financeSourceId} not found`);
            }

            // Convert account balance to USD if not already in USD
            let accountBalanceUsd = transactionData.remainingBalance;

            if (financeSource.currency !== "USD") {
                try {
                    const convertedBalance = await exchangeRateService.convertCurrency(
                        transactionData.remainingBalance,
                        financeSource.currency,
                        "USD"
                    );
                    accountBalanceUsd = convertedBalance.toNumber();
                } catch (error) {
                    logger.error(`Failed to convert ${financeSource.currency} to USD:`, error);
                    // Keep original balance if conversion fails
                }
            }

            // Create statement data structure
            const statement = {
                accountBalance: transactionData.remainingBalance,
                accountBalanceUsd,
                statementDate: transactionData.transactionDate,
                data: {
                    ...transactionData,
                    // Convert transaction data to a format compatible with BankStatementData interface
                    transactions: [
                        {
                            name: transactionData.merchantDetails || transactionData.transactionType,
                            date: transactionData.transactionDate.toISOString().split("T")[0], // YYYY-MM-DD
                            amount: transactionData.transactionAmount,
                            category: transactionData.category
                        }
                    ]
                }
            };

            // Save to database
            const savedStatement = await this.financeSourceRepository.saveStatement(financeSourceId, statement);

            logger.info(`Saved transaction data for account ${transactionData.accountNumber}`);

            return savedStatement;
        } catch (error) {
            logger.error("Error saving finance statement:", error);
            throw new Error(`Failed to save finance statement: ${error}`);
        }
    }

    /**
     * Extract transaction data from email content using LangChain
     */
    private async extractTransactionData(email: Email): Promise<RaiffeisenTransactionData> {
        // Prefer HTML content, but fall back to text if needed
        const content = email.htmlContent || email.textContent;

        if (!content) {
            throw new Error("Email has no content");
        }

        // Use LangChain with our extraction tool to parse the email
        const systemPrompt = `You are a financial data extraction assistant specialized in processing Czech bank notifications from Raiffeisen Bank.
        
Extract the following information from the bank notification email:
1. Account number (including bank code)
2. Account holder name
3. Card number (if available)
4. Transaction amount (as a number, should be negative for withdrawals)
5. Transaction date and time (in ISO format)
6. Transaction type (e.g., "Platba kartou" / Card payment)
7. Symbol/transaction ID (if available)
8. Merchant details (e.g., "HULK GYM; Brno; CZE")
9. Remaining balance after transaction (as a number)
10. Currency (usually CZK)
11. Transaction category based on the merchant details or transaction type

Be precise with the numerical values - make sure to convert string representations like "1.234,56" to number 1234.56 or "-150,00" to -150.
Use the extractRaiffeisenTransaction tool to provide the structured data.`;

        try {
            // Extract data using our tool
            const extractedData = await this.langchainService.extractWithTool<RaiffeisenTransactionData>(
                this.extractTransactionTool,
                `Extract structured data from this Raiffeisen Bank notification email:\n\n${content}`,
                systemPrompt
            );

            // Validate the parsed data
            transactionSchema.parse(extractedData);

            // Ensure date is a Date object
            extractedData.transactionDate = new Date(extractedData.transactionDate);

            return extractedData;
        } catch (error) {
            logger.error("Error extracting transaction data:", error);
            throw new Error(`Failed to extract transaction data: ${error}`);
        }
    }

    /**
     * Get or create a finance source for Raiffeisen Bank
     */
    private async getOrCreateFinanceSource(accountNumber: string): Promise<{ id: string; name: string }> {
        try {
            // Get all finance sources
            const sources = await this.financeSourceRepository.getAll();

            // Look for Raiffeisen Bank account with matching account number
            const existingSource = sources.find(
                (source) => source.type === this.FINANCE_SOURCE_TYPE && source.accountNumber === accountNumber
            );

            if (existingSource) {
                return { id: existingSource.id, name: existingSource.name };
            }

            // Create new finance source if it doesn't exist
            const newSource = await this.financeSourceRepository.create(
                this.FINANCE_SOURCE_NAME,
                this.FINANCE_SOURCE_TYPE,
                accountNumber,
                `Raiffeisen Bank account ${accountNumber}`,
                "CZK" // Hardcode CZK currency for Raiffeisen Bank accounts
            );

            return { id: newSource.id, name: newSource.name };
        } catch (error) {
            logger.error("Error getting or creating finance source:", error);
            throw new Error(`Failed to get or create finance source: ${error}`);
        }
    }
}

// Export a singleton instance
export const raiffeisenEmailHandler = new RaiffeisenEmailHandler();
