import TelegramBot from "node-telegram-bot-api";
import { logger } from "../../utils/logger";
import { fileService } from "../../services/fileService";
import { assetsTrackerService, AssetType } from "../../services/assetsTracker";

/**
 * Set up command handlers for the bot
 */
export function setupCommandHandlers(
    bot: TelegramBot,
    sendMarkdownMessage: (chatId: number | string, text: string, options?: any) => Promise<TelegramBot.Message>
) {
    // Asset update command
    bot.onText(/\/updateassets/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            await sendMarkdownMessage(chatId, "Running asset update now. This may take a moment...");

            // Run the asset update
            const report = await assetsTrackerService().runAssetUpdateNow([chatId], bot);

            // The chart will be sent by the runAssetUpdateNow method
            await sendMarkdownMessage(chatId, report);
        } catch (error) {
            logger.error("Error running asset update:", error);
            await sendMarkdownMessage(chatId, "Sorry, there was an error updating assets. Please try again.");
        }
    });

    // Add test asset command
    bot.onText(/\/addasset (.+)/, async (msg, match) => {
        if (!match || !match[1]) return;

        const chatId = msg.chat.id;
        const assetSymbol = match[1].trim().toUpperCase();

        try {
            // Add a test asset (crypto by default)
            const asset = await assetsTrackerService().addAsset(assetSymbol, assetSymbol, AssetType.CRYPTO);

            // Record an initial value (just for testing)
            const initialValue = 1000; // $1000 as a placeholder
            await assetsTrackerService().recordAssetValue(asset.id, initialValue);

            await sendMarkdownMessage(
                chatId,
                `Added test asset: ${assetSymbol}\nID: ${asset.id}\nInitial value: $${initialValue}`
            );
        } catch (error) {
            logger.error(`Error adding test asset ${assetSymbol}:`, error);
            await sendMarkdownMessage(
                chatId,
                `Sorry, there was an error adding the test asset: ${(error as Error).message}`
            );
        }
    });

    // List assets command
    bot.onText(/\/listassets/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const assets = await assetsTrackerService().getAllAssets();

            if (assets.length === 0) {
                await sendMarkdownMessage(chatId, "No assets found. Use /addasset [symbol] to add a test asset.");
                return;
            }

            const assetList = assets
                .map((asset, index) => {
                    return `${index + 1}. *${asset.name}* (${asset.symbol}) - Type: ${asset.type}`;
                })
                .join("\n");

            await sendMarkdownMessage(chatId, `*Assets in database:*\n\n${assetList}`);
        } catch (error) {
            logger.error("Error listing assets:", error);
            await sendMarkdownMessage(chatId, "Sorry, there was an error listing assets. Please try again.");
        }
    });

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

    // Help command for asset operations
    bot.onText(/\/assethelp/, async (msg) => {
        const chatId = msg.chat.id;

        const helpText = `
*Asset Tracking Commands:*

- Use /updateassets to run the asset update immediately
- Use /addasset [symbol] to add a test asset
- Use /listassets to see all tracked assets
- Use /assethelp to show this help message
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
- Use /updateassets to run the asset update immediately
- Use /addasset [symbol] to add a test asset
- Use /listassets to see all tracked assets
- Use /assethelp for asset-related commands
- Use /help to show this help message
        `;

        await sendMarkdownMessage(chatId, helpText);
    });
}
