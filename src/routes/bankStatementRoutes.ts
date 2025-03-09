import { Router } from "express";
import { bankStatementController } from "../controllers/bankStatementController";

const router = Router();

/**
 * @swagger
 * /api/bank-statements/upload:
 *   post:
 *     summary: Upload and parse a bank statement PDF
 *     description: Upload a PDF bank statement for processing with OpenAI
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: bankStatement
 *         type: file
 *         description: The bank statement PDF file to upload
 *         required: true
 *     responses:
 *       200:
 *         description: Bank statement successfully parsed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - invalid file or no file provided
 *       500:
 *         description: Server error while processing the file
 */
router.post("/upload", bankStatementController.uploadAndParse.bind(bankStatementController));

/**
 * @swagger
 * /api/bank-statements/list:
 *   get:
 *     summary: List all available bank statement PDFs
 *     description: Retrieve a list of all bank statement PDF files available for parsing
 *     responses:
 *       200:
 *         description: List of bank statement files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get("/list", bankStatementController.listBankStatements.bind(bankStatementController));

/**
 * @swagger
 * /api/bank-statements/parse/{filename}:
 *   get:
 *     summary: Parse a single bank statement by filename
 *     description: Process a specific bank statement PDF and extract structured data
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         description: Filename of the bank statement PDF to parse
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bank statement successfully parsed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error while processing the file
 */
router.get("/parse/:filename", bankStatementController.parseBankStatement.bind(bankStatementController));

/**
 * @swagger
 * /api/bank-statements/parse-all:
 *   get:
 *     summary: Parse all bank statements
 *     description: Process all bank statement PDFs and extract structured data
 *     responses:
 *       200:
 *         description: All bank statements successfully parsed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error while processing the files
 */
router.get("/parse-all", bankStatementController.getAllBankStatements.bind(bankStatementController));

export default router;
