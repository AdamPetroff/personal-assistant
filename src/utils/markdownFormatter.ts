/**
 * Utility functions for formatting Telegram messages with Markdown
 */

import TelegramBot from "node-telegram-bot-api";

/**
 * Escapes special characters for Telegram's MarkdownV2 format
 * @param text Text to escape
 * @returns Escaped text safe for MarkdownV2
 */
export function escapeMarkdown(text: string): string {
    if (!text) return "";

    // Don't escape text that already contains escape sequences
    if (text.includes("\\")) {
        return text;
    }

    // Characters that need to be escaped in MarkdownV2
    const specialChars = ["_", "*", "[", "]", "(", ")", "~", "`", ">", "#", "+", "-", "=", "|", "{", "}", ".", "!"];

    let escapedText = text;
    specialChars.forEach((char) => {
        escapedText = escapedText.replace(new RegExp("\\" + char, "g"), "\\" + char);
    });

    return escapedText;
}

/**
 * Formats URLs for MarkdownV2 by properly escaping special characters in URLs
 * @param text Text that may contain URLs
 * @returns Text with properly formatted URLs for MarkdownV2
 */
export function formatUrlsForMarkdownV2(text: string): string {
    if (!text) return "";

    // This regex matches URLs starting with http:// or https://
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.replace(urlRegex, (url) => {
        // For MarkdownV2, we need to escape special characters in the URL
        // but in a specific way that works with Telegram's parser
        const escapedUrl = url.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");

        // Create a proper markdown link with the URL as both the text and the target
        return `[${escapedUrl}](${escapedUrl})`;
    });
}

/**
 * Formats text as bold using Markdown
 * @param text Text to format as bold
 * @returns Text formatted as bold
 */
export function formatBold(text: string): string {
    // Don't escape the text inside formatting markers for basic Markdown
    return `*${text}*`;
}

/**
 * Formats text as italic using Markdown
 * @param text Text to format as italic
 * @returns Text formatted as italic
 */
export function formatItalic(text: string): string {
    return `_${text}_`;
}

/**
 * Formats text as code using Markdown
 * @param text Text to format as code
 * @returns Text formatted as code
 */
export function formatCode(text: string): string {
    return `\`${text}\``;
}

/**
 * Formats text as a code block using Markdown
 * @param text Text to format as a code block
 * @param language Optional language for syntax highlighting
 * @returns Text formatted as a code block
 */
export function formatCodeBlock(text: string, language: string = ""): string {
    return `\`\`\`${language}\n${text}\n\`\`\``;
}

/**
 * Formats text as a link using Markdown
 * @param text Display text for the link
 * @param url URL for the link
 * @returns Text formatted as a link
 */
export function formatLink(text: string, url: string): string {
    return `[${text}](${url})`;
}

/**
 * Converts markdown headings (# Heading) to bold text for Telegram compatibility
 * @param text Text that may contain heading formats
 * @returns Text with headings converted to bold
 */
export function convertHeadingsToBold(text: string): string {
    if (!text) return "";

    // Replace heading patterns (e.g., "# Heading", "## Heading", "### Heading") with bold text
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
        return `*${content}*`;
    });
}

/**
 * Processes text to make it compatible with Telegram's basic Markdown
 * @param text Text to process
 * @returns Processed text compatible with Telegram's Markdown
 */
export function processMarkdownForTelegram(text: string): string {
    if (!text) return "";

    // Convert headings to bold
    let processed = convertHeadingsToBold(text);

    // Format URLs as proper Markdown links to prevent parsing issues
    // This regex matches URLs starting with http:// or https://
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processed = processed.replace(urlRegex, (url) => {
        // Create a proper markdown link with the URL as both the text and the target
        return `[${url}](${url})`;
    });

    // Add other processing steps here if needed

    return processed;
}

/**
 * Creates a wrapper function for bot.sendMessage that automatically applies Markdown formatting
 * @param bot Telegram bot instance
 * @param useMarkdownV2 Whether to use MarkdownV2 (true) or simpler Markdown (false)
 * @returns A wrapped sendMessage function with Markdown support
 */
export function createMarkdownSender(bot: TelegramBot, useMarkdownV2: boolean = false) {
    return (chatId: number | string, text: string, options: any = {}) => {
        // Use the simpler Markdown mode by default
        const parseMode = useMarkdownV2 ? "MarkdownV2" : "Markdown";

        // Process text based on the parse mode
        let processedText;
        if (useMarkdownV2) {
            // For MarkdownV2, first format URLs then escape the rest
            processedText = formatUrlsForMarkdownV2(text);
            processedText = escapeMarkdown(processedText);
        } else {
            // For basic Markdown, convert headings to bold and perform other necessary transformations
            processedText = processMarkdownForTelegram(text);
        }

        return bot.sendMessage(chatId, processedText, {
            ...options,
            parse_mode: parseMode
        });
    };
}
