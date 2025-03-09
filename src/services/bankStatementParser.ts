import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import OpenAI from "openai";
import { FileService } from "./fileService";
import pdfParse from "pdf-parse";

// Define the transaction interface
export interface BankTransaction {
    name: string;
    date: string;
    amount: number;
    category: string;
}

// Define the bank statement data interface
export interface BankStatementData {
    accountBalance: number;
    transactions: BankTransaction[];
    statementDate?: string;
    accountNumber?: string;
    bankName?: string;
}

export class BankStatementParserService {
    private openai: OpenAI;
    private fileService: FileService;
    private readonly bankStatementsDir: string;

    constructor() {
        if (!env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is required for bank statement parsing");
        }

        this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
        this.fileService = new FileService();
        this.bankStatementsDir = path.join(process.cwd(), "uploads", "bank_statements");

        // Ensure the bank statements directory exists
        this.ensureBankStatementsDirExists();
    }

    private async ensureBankStatementsDirExists(): Promise<void> {
        try {
            await fsPromises.access(this.bankStatementsDir);
        } catch (error) {
            await fsPromises.mkdir(this.bankStatementsDir, { recursive: true });
            logger.info(`Created bank statements directory: ${this.bankStatementsDir}`);
        }
    }

    /**
     * Process a PDF and extract structured data using OpenAI
     */
    public async processPdf(filePath: string): Promise<BankStatementData> {
        try {
            logger.info(`Processing bank statement PDF: ${filePath}`);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            // Extract text content from the PDF
            const pdfBuffer = await fsPromises.readFile(filePath);
            const pdfData = await pdfParse(pdfBuffer);

            // Log PDF information
            logger.info(`PDF processed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

            // If the text content is very large, we might need to chunk it
            const textContent = pdfData.text;

            // Call OpenAI API with the PDF text content
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are a financial document processing AI specialized in extracting information from bank statements.
            
Extract the following information from the bank statement text:
1. Total account balance (as a number without currency symbols)
2. Individual transactions with the following details for each:
   - Transaction name/description
   - Date (in YYYY-MM-DD format)
   - Amount (as a number, positive for deposits, negative for withdrawals)
   - Category (food, entertainment, transportation, bill payment, salary, transfer, etc.)

Format the results as a valid JSON object with the following structure:
{
  "accountBalance": number,
  "transactions": [
    {
      "name": string,
      "date": string,
      "amount": number,
      "category": string
    },
    ...
  ],
  "statementDate": string (optional),
  "accountNumber": string (optional),
  "bankName": string (optional)
}

Be as precise as possible with the transaction details and ensure all amount values are numbers, not strings.`
                    },
                    {
                        role: "user",
                        content: `Extract structured data from this bank statement text:\n\n${textContent}`
                    }
                ],
                max_tokens: 4000
            });

            // Extract and parse JSON from the response
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No content received from OpenAI");
            }

            // Extract JSON from the content
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*?}/);

            if (!jsonMatch) {
                throw new Error("Could not extract JSON from OpenAI response");
            }

            // Parse the extracted JSON
            const jsonContent = jsonMatch[1] || jsonMatch[0];
            const parsedData = JSON.parse(jsonContent);

            // Validate the parsed data
            this.validateParsedData(parsedData);

            return parsedData;
        } catch (error: any) {
            logger.error("Error parsing bank statement:", error);
            throw new Error(`Failed to parse bank statement: ${error.message}`);
        }
    }

    /**
     * Parse all bank statements in the bank_statements directory
     */
    public async parseAllBankStatements(): Promise<Record<string, BankStatementData>> {
        try {
            const files = await fsPromises.readdir(this.bankStatementsDir);
            const pdfFiles = files.filter((file) => path.extname(file).toLowerCase() === ".pdf");

            if (pdfFiles.length === 0) {
                logger.info("No PDF files found in the bank statements directory");
                return {};
            }

            const results: Record<string, BankStatementData> = {};

            for (const pdfFile of pdfFiles) {
                const filePath = path.join(this.bankStatementsDir, pdfFile);
                try {
                    results[pdfFile] = await this.processPdf(filePath);
                    logger.info(`Successfully parsed bank statement: ${pdfFile}`);
                } catch (error) {
                    logger.error(`Error parsing bank statement ${pdfFile}:`, error);
                    // Continue with the next file
                }
            }

            return results;
        } catch (error: any) {
            logger.error("Error parsing all bank statements:", error);
            throw new Error(`Failed to parse bank statements: ${error.message}`);
        }
    }

    /**
     * Validate the parsed data to ensure it has the required structure
     */
    private validateParsedData(data: any): void {
        if (typeof data !== "object" || data === null) {
            throw new Error("Parsed data is not an object");
        }

        if (typeof data.accountBalance !== "number") {
            throw new Error("Account balance is missing or not a number");
        }

        if (!Array.isArray(data.transactions)) {
            throw new Error("Transactions are missing or not an array");
        }

        for (const transaction of data.transactions) {
            if (typeof transaction !== "object" || transaction === null) {
                throw new Error("Transaction is not an object");
            }

            if (typeof transaction.name !== "string") {
                throw new Error("Transaction name is missing or not a string");
            }

            if (typeof transaction.date !== "string") {
                throw new Error("Transaction date is missing or not a string");
            }

            if (typeof transaction.amount !== "number") {
                throw new Error("Transaction amount is missing or not a number");
            }

            if (typeof transaction.category !== "string") {
                throw new Error("Transaction category is missing or not a string");
            }
        }
    }
}

export const bankStatementParserService = new BankStatementParserService();
