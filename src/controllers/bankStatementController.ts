import { Request, Response } from "express";
import path from "path";
import { promises as fsPromises } from "fs";
import multer, { FileFilterCallback } from "multer";
import { bankStatementParserService, BankStatementData } from "../services/bankStatementParser";
import { logger } from "../utils/logger";

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (
        req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) {
        cb(null, path.join(process.cwd(), "uploads", "bank_statements"));
    },
    filename: function (
        req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) {
        // Use the original filename, but ensure it's unique with a timestamp
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Create the upload middleware with file filter for PDFs only
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});

export class BankStatementController {
    /**
     * Upload and parse a bank statement PDF
     */
    public async uploadAndParse(req: Request, res: Response): Promise<void> {
        try {
            // Multer middleware will handle the file upload
            const uploadMiddleware = upload.single("bankStatement");

            uploadMiddleware(req, res, async (err) => {
                if (err) {
                    logger.error("Error uploading file:", err);
                    res.status(400).json({
                        success: false,
                        message: err.message
                    });
                    return;
                }

                // Check if file was uploaded
                const file = req.file;
                if (!file) {
                    res.status(400).json({
                        success: false,
                        message: "No file uploaded"
                    });
                    return;
                }

                try {
                    // Process the bank statement PDF
                    const parsedData = await bankStatementParserService.processPdf(file.path);

                    res.status(200).json({
                        success: true,
                        data: parsedData
                    });
                } catch (error: any) {
                    logger.error("Error parsing bank statement:", error);
                    res.status(500).json({
                        success: false,
                        message: `Error parsing bank statement: ${error.message}`
                    });
                }
            });
        } catch (error: any) {
            logger.error("Unexpected error in uploadAndParse:", error);
            res.status(500).json({
                success: false,
                message: `Unexpected error: ${error.message}`
            });
        }
    }

    /**
     * Get a list of all parsed bank statements
     */
    public async getAllBankStatements(req: Request, res: Response): Promise<void> {
        try {
            const parsedStatements = await bankStatementParserService.parseAllBankStatements();

            res.status(200).json({
                success: true,
                data: parsedStatements
            });
        } catch (error: any) {
            logger.error("Error getting all bank statements:", error);
            res.status(500).json({
                success: false,
                message: `Error getting bank statements: ${error.message}`
            });
        }
    }

    /**
     * List all bank statement PDFs without parsing them
     */
    public async listBankStatements(req: Request, res: Response): Promise<void> {
        try {
            const bankStatementsDir = path.join(process.cwd(), "uploads", "bank_statements");
            const files = await fsPromises.readdir(bankStatementsDir);
            const pdfFiles = files.filter((file) => path.extname(file).toLowerCase() === ".pdf");

            res.status(200).json({
                success: true,
                data: pdfFiles
            });
        } catch (error: any) {
            logger.error("Error listing bank statements:", error);
            res.status(500).json({
                success: false,
                message: `Error listing bank statements: ${error.message}`
            });
        }
    }

    /**
     * Parse a single bank statement by filename
     */
    public async parseBankStatement(req: Request, res: Response): Promise<void> {
        try {
            const { filename } = req.params;

            if (!filename) {
                res.status(400).json({
                    success: false,
                    message: "Filename is required"
                });
                return;
            }

            const filePath = path.join(process.cwd(), "uploads", "bank_statements", filename);

            // Check if the file exists
            try {
                await fsPromises.access(filePath);
            } catch (error) {
                res.status(404).json({
                    success: false,
                    message: `File not found: ${filename}`
                });
                return;
            }

            // Parse the bank statement
            const parsedData = await bankStatementParserService.processPdf(filePath);

            res.status(200).json({
                success: true,
                data: parsedData
            });
        } catch (error: any) {
            logger.error("Error parsing bank statement:", error);
            res.status(500).json({
                success: false,
                message: `Error parsing bank statement: ${error.message}`
            });
        }
    }
}

export const bankStatementController = new BankStatementController();
