import { z } from "zod";

// Transaction categories enum
const TransactionCategoryEnum = z.enum([
    "GROCERIES", // Food stores, supermarkets
    "RESTAURANT", // Dining out, cafes, bars
    "TRAVEL", // Transportation, flights, trains
    "ACCOMMODATION", // Hotels, rentals, lodging
    "BILLS", // Utilities, subscriptions, regular payments
    "TRANSFERS", // Bank transfers, money movements
    "SHOPPING", // Retail purchases, online shopping
    "ENTERTAINMENT", // Movies, events, streaming services
    "HEALTHCARE", // Medical expenses, pharmacy
    "EDUCATION", // Courses, books, training
    "OTHER" // Uncategorized transactions
]);

// Helper schemas
const MoneyAmount = z
    .object({
        amount: z.number().describe("The numerical value of the amount"),
        currency: z.string().describe('The three-letter currency code (e.g., "EUR", "USD")')
    })
    .describe("Represents a monetary value with its currency");

const TransactionSchema = z
    .object({
        date: z.date().describe("The date when the transaction occurred"),
        description: z.string().describe("The merchant name or transaction description"),
        amount: MoneyAmount.describe("The transaction amount (positive for credits, negative for debits)"),
        balance: MoneyAmount.describe("The account balance after this transaction"),
        category: TransactionCategoryEnum.describe("The category of the transaction based on its nature")
    })
    .describe("Represents a single transaction in the statement");

// Main statement schema
const RevolutStatementSchema = z
    .object({
        // Document metadata
        documentType: z.literal("EUR Statement").describe("The type of statement document"),

        // Account holder info
        accountHolder: z
            .object({
                name: z.string().describe("Full name of the account holder"),
                accountNumber: z.string().optional().describe("IBAN or account number if available")
            })
            .describe("Information about the account holder"),

        // Statement period
        period: z
            .object({
                from: z.date().describe("Start date of the statement period"),
                to: z.date().describe("End date of the statement period")
            })
            .describe("The time period covered by this statement"),

        // Balance summary
        balanceSummary: z
            .object({
                openingBalance: MoneyAmount.describe("Account balance at the start of the period"),
                closingBalance: MoneyAmount.describe("Account balance at the end of the period")
            })
            .describe("Summary of account balances for the period"),

        // Transactions sections
        transactions: z
            .object({
                pending: z
                    .array(TransactionSchema)
                    .optional()
                    .describe("Transactions that have been initiated but not yet settled"),
                completed: z
                    .array(TransactionSchema)
                    .describe("Transactions that have been fully processed and settled")
            })
            .describe("All transactions within the statement period")
    })
    .describe("Complete structure of a Revolut bank statement");

// Type inference
type RevolutStatement = z.infer<typeof RevolutStatementSchema>;

// Export both the schema and the type
export { RevolutStatementSchema, type RevolutStatement };
