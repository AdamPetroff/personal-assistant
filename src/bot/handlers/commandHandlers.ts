import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { fileService } from "../../services/fileService";

/**
 * Set up command handlers for the bot
 */
export function setupCommandHandlers(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) {
    // File listing command
    bot.onText(/\/files/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            // List all files
            const files = await fileService.listFiles();

            if (files.length === 0) {
                await sendMarkdownMessage(chatId, "No files found in storage.");
                return;
            }

            // Format the file list
            const fileList = files
                .map((file, index) => {
                    const originalName = file.metadata?.originalName || file.fileKey;
                    const uploadDate = file.metadata?.uploadDate || "Unknown date";
                    return `${index + 1}. *${originalName}*\n   Uploaded: ${uploadDate}\n ${fileService.getPublicUrl(file.fileKey)}`;
                })
                .join("\n\n");
            await sendMarkdownMessage(chatId, `*Files in storage:*\n\n${fileList}`);
        } catch (error) {
            logger.error("Error listing files:", error);
            await sendMarkdownMessage(chatId, "Sorry, there was an error listing files. Please try again.");
        }
    });

    // File deletion command
    bot.onText(/\/deletefile (.+)/, async (msg, match) => {
        if (!match || !match[1]) return;

        const chatId = msg.chat.id;
        const fileKey = match[1].trim();

        try {
            await fileService.deleteFile(fileKey);
            await sendMarkdownMessage(chatId, `File deleted successfully: ${fileKey}`);
        } catch (error) {
            logger.error("Error deleting file:", error);
            await sendMarkdownMessage(chatId, "Sorry, there was an error deleting the file. Please try again.");
        }
    });

    // Help command for file operations
    bot.onText(/\/filehelp/, async (msg) => {
        const chatId = msg.chat.id;

        const helpText = `
*File Storage Commands:*

- Send any file, photo, video, audio, or voice message to upload it to storage
- Use /files to list all stored files
- Use /deletefile [fileKey] to delete a specific file
- Use /filehelp to show this help message
        `;

        await sendMarkdownMessage(chatId, helpText);
    });

    // General help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        const helpText = `
*Available Commands:*

- Send a message to chat with the bot
- Reply to a bot message to continue the conversation
- Use /files to list all stored files
- Use /filehelp for file-related commands
- Use /help to show this help message
        `;

        await sendMarkdownMessage(chatId, helpText);
    });
}
