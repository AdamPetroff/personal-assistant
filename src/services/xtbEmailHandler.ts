import { logger } from "../utils/logger";
import { env } from "../config/constants";
import GmailService, { Email, EmailAttachment } from "./gmail";
import { FinanceSourceRepository } from "./database/repositories/FinanceSourceRepository";
import { langchainService, LangchainService } from "./langchain";
import { exchangeRateService } from "./exchangeRate";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import { FileService } from "./fileService";
import OpenAI from "openai";
import { PDFDocument } from "@cantoo/pdf-lib";

// Define position categories
export enum PositionCategory {
    Stocks = "stocks",
    Forex = "forex",
    Commodities = "commodities",
    Indices = "indices",
    Crypto = "crypto",
    ETF = "etf",
    Other = "other"
}

// Interface to represent parsed XTB data
interface XtbStatementData {
    accountNumber: string;
    accountHolder: string;
    totalBalance: number;
    freeMargin: number;
    currency: string;
    statementDate: Date;
    openPositions: XtbPosition[];
}

// Interface for open positions
interface XtbPosition {
    symbol: string;
    name: string;
    openDate: Date;
    openPrice: number;
    currentPrice: number;
    volume: number;
    value: number;
    profitLoss: number;
    category: PositionCategory;
}

// Define the schema for XTB statement data extraction
const xtbStatementSchema = z.object({
    accountNumber: z.string().describe("The account number"),
    accountHolder: z.string().describe("The account holder's name"),
    totalBalance: z
        .number()
        .describe("The total account balance (as a number). It's might be called 'Majetek' in the provided text."),
    freeMargin: z
        .number()
        .describe("The free margin (as a number). It might be called'Volná marže' in the provided text."),
    currency: z.string().describe("The currency code (EUR, USD, CZK, etc.)"),
    statementDate: z.string().describe("The statement date in ISO format"),
    openPositions: z
        .array(
            z.object({
                symbol: z.string().describe("The trading symbol (e.g., EURUSD, AAPL, etc.)"),
                name: z.string().describe("The descriptive name of the position"),
                openDate: z.string().describe("The date when the position was opened in ISO format"),
                openPrice: z.number().describe("The opening price of the position"),
                currentPrice: z.number().describe("The current price of the position"),
                volume: z.number().describe("The volume/quantity of the position"),
                value: z.number().describe("The current total value of the position"),
                profitLoss: z
                    .number()
                    .describe("The unrealized profit/loss of the position (positive for profit, negative for loss)"),
                category: z
                    .nativeEnum(PositionCategory)
                    .describe("The category of the position (stocks, forex, commodities, etc.)")
            })
        )
        .describe("List of open positions in the trading account")
});

export class XtbEmailHandler {
    private langchainService: LangchainService;
    private financeSourceRepository: FinanceSourceRepository;
    private openai: OpenAI;
    private fileService: FileService;
    private readonly XTB_EMAIL_SENDER = "dailystatements@xtb.com";
    private readonly FINANCE_SOURCE_TYPE = "trading_account";
    private readonly FINANCE_SOURCE_NAME = "XTB Trading";
    private readonly PDF_PASSWORD = env.PDF_PASSWORD;
    private readonly tempDir: string;
    private extractStatementDataTool: DynamicStructuredTool<typeof xtbStatementSchema>;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required for email processing");
        }

        // Create OpenAI instance for PDF extraction
        this.openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });

        this.langchainService = langchainService;
        this.financeSourceRepository = new FinanceSourceRepository();
        this.fileService = new FileService();

        // Create temp directory for PDF extraction
        this.tempDir = path.join(process.cwd(), "temp", "xtb_statements");
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        // Create the structured tool for extracting XTB statement data
        this.extractStatementDataTool = new DynamicStructuredTool({
            name: "extractXtbStatementData",
            description: "Extract statement data from XTB trading account statement PDF",
            schema: xtbStatementSchema,
            func: async (input: z.infer<typeof xtbStatementSchema>) => {
                return input;
            }
        });
    }

    /**
     * Process all unread XTB statements emails
     */
    public async processUnreadEmails(): Promise<number> {
        try {
            if (!GmailService.isConfigured()) {
                logger.error("Gmail service is not configured");
                throw new Error("Gmail service is not configured");
            }

            // Search for unread emails from XTB with attachments
            const query = `is:unread from:${this.XTB_EMAIL_SENDER} has:attachment`;
            const emails = await GmailService.listEmails(30, query);

            if (emails.length === 0) {
                logger.info("No unread XTB statement emails found");
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
                    logger.info(`Processed XTB statement email: ${emailMeta.subject}`);
                } catch (error) {
                    logger.error(`Error processing email ${emailMeta.id}:`, error);
                    // Continue with next email
                }
            }

            return processedCount;
        } catch (error) {
            logger.error("Error processing XTB statement emails:", error);
            throw new Error(`Failed to process XTB statement emails: ${error}`);
        }
    }

    /**
     * Process a single XTB statement email
     */
    private async processEmail(email: Email): Promise<void> {
        // Check if email has PDF attachments
        if (!email.attachments || email.attachments.length === 0) {
            logger.warn("XTB email has no attachments");
            return;
        }

        // Get PDF attachments - accept both application/pdf and application/octet-stream with .pdf extension
        const pdfAttachments = email.attachments.filter(
            (attachment) =>
                attachment.mimeType === "application/pdf" ||
                (attachment.mimeType === "application/octet-stream" &&
                    attachment.filename.toLowerCase().endsWith(".pdf"))
        );

        if (pdfAttachments.length === 0) {
            logger.warn("XTB email has no PDF attachments");
            return;
        }

        // Process each PDF attachment
        for (const attachment of pdfAttachments) {
            try {
                // Extract data from the PDF attachment
                const statementData = await this.extractDataFromPdfAttachment(email.id, attachment);

                // Get or create the finance source for XTB
                const financeSource = await this.getOrCreateFinanceSource(
                    statementData.accountNumber,
                    statementData.currency
                );

                // Save the statement data as a finance statement
                await this.saveFinanceStatement(financeSource.id, statementData);
            } catch (error) {
                logger.error(`Error processing PDF attachment ${attachment.filename}:`, error);
                // Continue with next attachment
            }
        }
    }

    /**
     * Extract data from a password-protected PDF attachment
     */
    private async extractDataFromPdfAttachment(
        emailId: string,
        attachment: EmailAttachment
    ): Promise<XtbStatementData> {
        try {
            // Generate temporary file paths
            const encryptedPdfPath = path.join(this.tempDir, `${Date.now()}_${attachment.filename}`);
            const decryptedPdfPath = path.join(this.tempDir, `${Date.now()}_decrypted_${attachment.filename}`);

            try {
                // Download the attachment
                const attachmentBuffer = await GmailService.downloadAttachment(emailId, attachment.attachmentId);

                // Save the encrypted PDF
                await fsPromises.writeFile(encryptedPdfPath, attachmentBuffer);

                // Decrypt the PDF using pdf-lib
                await this.decryptPdf(encryptedPdfPath, decryptedPdfPath, this.PDF_PASSWORD);

                // Extract text from the PDF
                const pdfText = await this.extractTextFromPdf(decryptedPdfPath);

                // Extract structured data from the PDF text
                const statementData = await this.extractStructuredData(pdfText);

                return statementData;
            } finally {
                // Clean up temporary files
                await this.cleanupTempFiles([encryptedPdfPath, decryptedPdfPath]);
            }
        } catch (error) {
            logger.error(`Error extracting data from PDF:`, error);
            throw new Error(`Failed to extract data from PDF: ${error}`);
        }
    }

    /**
     * Decrypt a password-protected PDF
     */
    private async decryptPdf(inputPath: string, outputPath: string, password: string): Promise<void> {
        try {
            // Read the PDF file
            const pdfBytes = await fsPromises.readFile(inputPath);

            // Load the PDF with password
            const pdfDoc = await PDFDocument.load(pdfBytes, { password });

            // Save the decrypted PDF
            const decryptedBytes = await pdfDoc.save();
            await fsPromises.writeFile(outputPath, decryptedBytes);

            logger.info(`Successfully decrypted PDF to ${outputPath}`);
        } catch (error) {
            logger.error(`Error decrypting PDF:`, error);
            throw new Error(`Failed to decrypt PDF: ${error}`);
        }
    }

    /**
     * Extract text from a PDF file
     */
    private async extractTextFromPdf(pdfPath: string): Promise<string> {
        try {
            // Use pdf-parse instead of OpenAI API for text extraction
            const pdfBuffer = await fsPromises.readFile(pdfPath);

            try {
                // Import pdf-parse dynamically to avoid circular dependencies
                const pdfParse = await import("pdf-parse");

                // Extract text from PDF
                const pdfData = await pdfParse.default(pdfBuffer);

                // Return the extracted text
                return pdfData.text;
            } catch (error: any) {
                logger.error(`Error parsing PDF with pdf-parse:`, error);
                // If pdf-parse fails, use a simpler approach
                // This is a fallback method that just returns basic info
                return `XTB Trading Statement - Document extraction failed with error: ${error.message || "Unknown error"}. Unable to extract detailed content.`;
            }
        } catch (error) {
            logger.error(`Error extracting text from PDF:`, error);
            throw new Error(`Failed to extract text from PDF: ${error}`);
        }
    }

    /**
     * Extract structured data from PDF text using LangChain
     */
    private async extractStructuredData(pdfText: string): Promise<XtbStatementData> {
        try {
            // Use LangChain with our extraction tool to parse the PDF text
            const systemPrompt = `You are a financial data extraction assistant specialized in processing trading account statements from XTB.
            
Extract information from the XTB statement.
Be precise with numerical values - convert string representations to numbers without currency symbols.
Use the extractXtbStatementData tool to provide the structured data.`;

            logger.info(`Extracting structured data from XTB statement.`);
            // Extract data using our tool
            const extractedData = await this.langchainService.extractWithTool<XtbStatementData>(
                this.extractStatementDataTool,
                `Extract structured data from this XTB trading statement:\n\n${pdfText}`,
                systemPrompt
            );
            logger.info(`Extracted structured data from XTB statement.`);

            // Validate the parsed data
            xtbStatementSchema.parse(extractedData);

            // Ensure dates are Date objects
            extractedData.statementDate = new Date(extractedData.statementDate);
            extractedData.openPositions = extractedData.openPositions.map((position) => ({
                ...position,
                openDate: new Date(position.openDate)
            }));

            return extractedData;
        } catch (error) {
            logger.error("Error extracting structured data:", error);
            throw new Error(`Failed to extract structured data: ${error}`);
        }
    }

    /**
     * Clean up temporary files
     */
    private async cleanupTempFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            try {
                if (fs.existsSync(filePath)) {
                    await fsPromises.unlink(filePath);
                }
            } catch (error) {
                logger.warn(`Failed to delete temporary file ${filePath}:`, error);
                // Continue cleanup even if one file fails
            }
        }
    }

    /**
     * Get or create a finance source for XTB
     */
    private async getOrCreateFinanceSource(
        accountNumber: string,
        currency: string
    ): Promise<{ id: string; name: string }> {
        try {
            // Get all finance sources
            const sources = await this.financeSourceRepository.getAll();

            // Look for XTB account with matching account number
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
                `XTB Trading account ${accountNumber}`,
                currency as any // Cast currency to any to bypass type check
            );

            return { id: newSource.id, name: newSource.name };
        } catch (error) {
            logger.error("Error getting or creating finance source:", error);
            throw new Error(`Failed to get or create finance source: ${error}`);
        }
    }

    /**
     * Save statement data as a finance statement
     */
    private async saveFinanceStatement(financeSourceId: string, statementData: XtbStatementData): Promise<void> {
        try {
            // Get the finance source to determine its currency
            const financeSource = await this.financeSourceRepository.getById(financeSourceId);

            if (!financeSource) {
                throw new Error(`Finance source with ID ${financeSourceId} not found`);
            }

            statementData.totalBalance = statementData.totalBalance + statementData.freeMargin;

            // Convert account balance to USD if not already in USD
            let accountBalanceUsd = statementData.totalBalance;

            if (financeSource.currency !== "USD") {
                try {
                    const convertedBalance = await exchangeRateService.convertCurrency(
                        statementData.totalBalance,
                        financeSource.currency,
                        "USD"
                    );
                    accountBalanceUsd = convertedBalance.toNumber();
                } catch (error) {
                    logger.error(`Failed to convert ${financeSource.currency} to USD:`, error);
                    // Keep original balance if conversion fails
                }
            }

            // Calculate total position value
            const totalPositionValue = statementData.openPositions.reduce((sum, position) => sum + position.value, 0);

            // Create statement data structure
            const statement = {
                accountBalance: statementData.totalBalance,
                accountBalanceUsd,
                statementDate: statementData.statementDate,
                data: {
                    ...statementData,
                    totalPositionValue,
                    // Format openPositions for better readability in the database
                    positions: statementData.openPositions.map((position) => ({
                        symbol: position.symbol,
                        name: position.name,
                        openDate: position.openDate.toISOString().split("T")[0], // YYYY-MM-DD
                        openPrice: position.openPrice,
                        currentPrice: position.currentPrice,
                        volume: position.volume,
                        value: position.value,
                        profitLoss: position.profitLoss,
                        category: position.category
                    }))
                }
            };

            // Save to database
            await this.financeSourceRepository.saveStatement(financeSourceId, statement);

            logger.info(`Saved XTB statement data for account ${statementData.accountNumber}`);
        } catch (error) {
            logger.error("Error saving finance statement:", error);
            throw new Error(`Failed to save finance statement: ${error}`);
        }
    }
}

// Export a singleton instance
export const xtbEmailHandler = new XtbEmailHandler();
