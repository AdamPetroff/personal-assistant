import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { fileService } from "../../services/fileService";
import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import axios from "axios";
import { TELEGRAM_BOT_TOKEN } from "../../config/constants";
import { langchainService } from "../../services/langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Stream } from "stream";
import { revolutStatementService } from "../../services/revolutStatementService";

async function getTelegramFileUrl(bot: TelegramBot, fileId: string) {
    const fileInfo = await bot.getFile(fileId);
    return { url: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`, fileInfo };
}

async function fetchTelegramFile(bot: TelegramBot, fileId: string) {
    try {
        // Get file info from Telegram
        const { url, fileInfo } = await getTelegramFileUrl(bot, fileId);

        // Ensure uploads directory exists
        await fsPromises.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

        // Download the file
        const response = await axios({
            method: "GET",
            url,
            responseType: "stream"
        });

        return { fileInfo, fileStream: response.data as Stream };
    } catch (error) {
        logger.error("Error downloading file from Telegram:", error);
        throw new Error("Failed to download file from Telegram");
    }
}

/**
 * Download a file from Telegram servers
 */
async function downloadTelegramFile(bot: TelegramBot, fileId: string): Promise<{ filePath: string; fileName: string }> {
    try {
        const { fileStream, fileInfo } = await fetchTelegramFile(bot, fileId);

        // Create a unique filename
        const fileName = path.basename(fileInfo.file_path || `file_${Date.now()}`);
        const downloadPath = path.join(process.cwd(), "uploads", fileName);

        // Ensure uploads directory exists
        await fsPromises.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

        // Save the file
        const writer = fs.createWriteStream(downloadPath);
        fileStream.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                resolve({ filePath: downloadPath, fileName });
            });
            writer.on("error", reject);
        });
    } catch (error) {
        logger.error("Error downloading file from Telegram:", error);
        throw new Error("Failed to download file from Telegram");
    }
}

/**
 * Handle file upload to S3 and return a download link
 */
async function handleFileUpload(
    bot: TelegramBot,
    fileId: string,
    originalName: string,
    mimeType: string
): Promise<string> {
    try {
        // Download the file from Telegram
        const { filePath, fileName } = await downloadTelegramFile(bot, fileId);

        // Upload to S3
        const { fileKey } = await fileService.uploadFile(filePath, originalName || fileName, mimeType);

        // Clean up the local file
        await fsPromises.unlink(filePath);

        // Generate a download link
        const downloadUrl = fileService.getPublicUrl(fileKey);

        return `File uploaded successfully! Download link: ${downloadUrl}`;
    } catch (error) {
        logger.error("Error handling file upload:", error);
        return "Sorry, there was an error uploading your file. Please try again.";
    }
}

/**
 * Set up file handling for the bot
 */
export function setupFileHandlers(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) {
    // Handle document uploads (general files)
    bot.on("document", async (msg) => {
        if (!msg.document) return;

        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;
        const fileName = msg.document.file_name || `document_${Date.now()}`;
        const mimeType = msg.document.mime_type || "application/octet-stream";

        // Send a processing message and store its ID
        const processingMessage = await bot.sendMessage(chatId, "Processing your file upload...");

        // Parse intent if caption exists
        let intentResponse = "Document upload completed.";

        // Define the document intent tool
        const documentIntentTool = tool(async () => {}, {
            name: "parseDocumentIntent",
            description: "Parse the user's intent when uploading a document",
            schema: z.object({
                intent: z.enum(["revolut statement", "other"]),
                description: z.string().optional()
            })
        });

        if (msg.caption) {
            try {
                const extractedData = await langchainService.extractWithTool<typeof documentIntentTool.schema._type>(
                    documentIntentTool,
                    msg.caption,
                    `Extract the user's intent from their document caption. Also extract any description they might have provided.`
                );

                // Handle different intents
                switch (extractedData.intent) {
                    case "revolut statement":
                        const stream = await fetchTelegramFile(bot, fileId);

                        try {
                            await revolutStatementService.processStatementPdfFile(stream.fileStream);
                            intentResponse = `The statement has been processed and saved successfully.`;
                        } catch (error) {
                            logger.error("Error processing Revolut statement:", error);
                            intentResponse =
                                "Error processing the Revolut statement. Please try again or contact support.";
                        }
                        break;
                    default:
                        // Handle default case by using the regular file upload
                        const response = await handleFileUpload(bot, fileId, fileName, mimeType);
                        intentResponse = response;
                }
            } catch (error) {
                logger.error("Error parsing document intent:", error);
                // Continue with default processing if intent parsing fails
                const response = await handleFileUpload(bot, fileId, fileName, mimeType);
                intentResponse = response;
            }
        } else {
            // No caption, use default file upload handling
            const response = await handleFileUpload(bot, fileId, fileName, mimeType);
            intentResponse = response;
        }

        // Send the response and delete the processing message
        await Promise.all([
            sendMarkdownMessage(chatId, intentResponse),
            bot.deleteMessage(chatId, processingMessage.message_id)
        ]);
    });

    // Handle photo uploads
    bot.on("photo", async (msg) => {
        if (!msg.photo || msg.photo.length === 0) return;

        const chatId = msg.chat.id;
        // Get the highest quality photo (last in the array)
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        const fileName = `photo_${Date.now()}.jpg`;
        const mimeType = "image/jpeg";

        // Send a processing message and store its ID
        const processingMessage = await bot.sendMessage(chatId, "Processing your photo upload...");

        // Parse intent if caption exists
        let intentResponse = "Photo upload completed.";
        let customFileName = fileName;

        // Define the photo intent tool
        const photoIntentTool = tool(async () => {}, {
            name: "parsePhotoIntent",
            description: "Parse the user's intent when uploading a photo",
            schema: z.object({
                intent: z.enum(["revolut statement", "other"]),
                description: z.string().optional()
            })
        });

        if (msg.caption) {
            try {
                const extractedData = await langchainService.extractWithTool<typeof photoIntentTool.schema._type>(
                    photoIntentTool,
                    msg.caption,
                    `Extract the user's intent from their photo caption. Also extract any description they might have provided.`
                );

                // Handle different intents
                switch (extractedData.intent) {
                    case "revolut statement":
                        const stream = await fetchTelegramFile(bot, fileId);

                        try {
                            // For photos of Revolut statements, we could use image processing
                            // Since the full statement might not be visible in a photo,
                            // we would typically extract just key information like the total balance

                            const extractedData = await langchainService.extractDataFromImage(
                                stream.fileStream,
                                z.object({
                                    totalBalance: z.number().describe("The total balance of the bank statement"),
                                    currency: z.string().describe("The currency code of the statement (e.g., USD, EUR)")
                                }),
                                `Extract the total balance and currency from the bank statement photo.`
                            );

                            // Convert to USD if needed
                            const totalBalanceUsd = await revolutStatementService.convertToUsd(
                                extractedData.totalBalance,
                                extractedData.currency
                            );

                            intentResponse = `Total balance: ${extractedData.totalBalance} ${extractedData.currency}\nUSD equivalent: $${totalBalanceUsd.toFixed(2)}`;
                        } catch (error) {
                            logger.error("Error processing Revolut statement photo:", error);
                            intentResponse =
                                "Error processing the Revolut statement photo. Please try uploading the full PDF statement for better results.";
                        }
                        break;
                    default:
                        intentResponse = "Your photo has been processed with the default settings.";
                }
            } catch (error) {
                logger.error("Error parsing photo intent:", error);
                // Continue with default processing if intent parsing fails
            }
        }

        // Send the response and delete the processing message
        await Promise.all([
            sendMarkdownMessage(chatId, `test: ${intentResponse}`),
            bot.deleteMessage(chatId, processingMessage.message_id)
        ]);
    });

    // Handle audio uploads
    bot.on("audio", async (msg) => {
        if (!msg.audio) return;

        const chatId = msg.chat.id;
        const fileId = msg.audio.file_id;
        const fileName = msg.audio.title || `audio_${Date.now()}`;
        const mimeType = msg.audio.mime_type || "audio/mpeg";

        // Send a processing message and store its ID
        const processingMessage = await bot.sendMessage(chatId, "Processing your audio upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response and delete the processing message
        await Promise.all([
            sendMarkdownMessage(chatId, response),
            bot.deleteMessage(chatId, processingMessage.message_id)
        ]);
    });

    // Handle video uploads
    bot.on("video", async (msg) => {
        if (!msg.video) return;

        const chatId = msg.chat.id;
        const fileId = msg.video.file_id;
        const fileName = `video_${Date.now()}.mp4`;
        const mimeType = msg.video.mime_type || "video/mp4";

        // Send a processing message and store its ID
        const processingMessage = await bot.sendMessage(chatId, "Processing your video upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response and delete the processing message
        await Promise.all([
            sendMarkdownMessage(chatId, response),
            bot.deleteMessage(chatId, processingMessage.message_id)
        ]);
    });

    // Handle voice uploads
    bot.on("voice", async (msg) => {
        if (!msg.voice) return;

        const chatId = msg.chat.id;
        const fileId = msg.voice.file_id;
        const fileName = `voice_${Date.now()}.ogg`;
        const mimeType = msg.voice.mime_type || "audio/ogg";

        // Send a processing message and store its ID
        const processingMessage = await bot.sendMessage(chatId, "Processing your voice message...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response and delete the processing message
        await Promise.all([
            sendMarkdownMessage(chatId, response),
            bot.deleteMessage(chatId, processingMessage.message_id)
        ]);
    });
}
