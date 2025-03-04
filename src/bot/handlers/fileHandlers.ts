import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { fileService } from "../../services/fileService";
import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";
import axios from "axios";
import { TELEGRAM_BOT_TOKEN } from "../../config/constants";

/**
 * Download a file from Telegram servers
 */
async function downloadTelegramFile(bot: TelegramBot, fileId: string): Promise<{ filePath: string; fileName: string }> {
    try {
        // Get file info from Telegram
        const fileInfo = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

        // Create a unique filename
        const fileName = path.basename(fileInfo.file_path || `file_${Date.now()}`);
        const downloadPath = path.join(process.cwd(), "uploads", fileName);

        // Ensure uploads directory exists
        await fsPromises.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

        // Download the file
        const response = await axios({
            method: "GET",
            url: fileUrl,
            responseType: "stream"
        });

        // Save the file
        const writer = fs.createWriteStream(downloadPath);
        response.data.pipe(writer);

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

        // Send a processing message
        await bot.sendMessage(chatId, "Processing your file upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response
        await sendMarkdownMessage(chatId, response);
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

        // Send a processing message
        await bot.sendMessage(chatId, "Processing your photo upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response
        await sendMarkdownMessage(chatId, response);
    });

    // Handle audio uploads
    bot.on("audio", async (msg) => {
        if (!msg.audio) return;

        const chatId = msg.chat.id;
        const fileId = msg.audio.file_id;
        const fileName = msg.audio.title || `audio_${Date.now()}`;
        const mimeType = msg.audio.mime_type || "audio/mpeg";

        // Send a processing message
        await bot.sendMessage(chatId, "Processing your audio upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response
        await sendMarkdownMessage(chatId, response);
    });

    // Handle video uploads
    bot.on("video", async (msg) => {
        if (!msg.video) return;

        const chatId = msg.chat.id;
        const fileId = msg.video.file_id;
        const fileName = `video_${Date.now()}.mp4`;
        const mimeType = msg.video.mime_type || "video/mp4";

        // Send a processing message
        await bot.sendMessage(chatId, "Processing your video upload...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response
        await sendMarkdownMessage(chatId, response);
    });

    // Handle voice uploads
    bot.on("voice", async (msg) => {
        if (!msg.voice) return;

        const chatId = msg.chat.id;
        const fileId = msg.voice.file_id;
        const fileName = `voice_${Date.now()}.ogg`;
        const mimeType = msg.voice.mime_type || "audio/ogg";

        // Send a processing message
        await bot.sendMessage(chatId, "Processing your voice message...");

        // Handle the file upload
        const response = await handleFileUpload(bot, fileId, fileName, mimeType);

        // Send the response
        await sendMarkdownMessage(chatId, response);
    });
}
