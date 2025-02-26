# Show Markdown in Telegram Messages

We're sending markdown in our telegram messages, but it's not showing up. For example, I see stars instead of bold font.

## Solution

The issue is that Telegram requires explicitly setting the `parse_mode` parameter when sending messages with Markdown formatting. Currently, our bot is sending messages without specifying this parameter.

### Implementation Steps

1. **Update Bot Message Sending**

    - Modify all instances of `bot.sendMessage()` to include the `parse_mode` parameter
    - Example:
        ```typescript
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        ```

2. **Create Markdown Formatting Utility**

    - Create a new utility file `src/utils/markdownFormatter.ts`
    - Implement functions for formatting text as bold, italic, code, etc.
    - Create a wrapper function for `sendMessage` that automatically sets the parse_mode
    - Add a function to convert heading formats (# Heading) to bold text

3. **Choose the Right Parse Mode**

    - **Markdown**: Simpler but limited (supports `*bold*`, `_italic_`, `` `code` ``, and `pre`)
    - **MarkdownV2**: More features but requires stricter escaping (adds support for underline, strikethrough, and more)
    - We're using the simpler **Markdown** mode to avoid escaping issues

4. **Example Implementation**

    ```typescript
    // src/utils/markdownFormatter.ts
    export function formatBold(text: string): string {
        return `*${text}*`;
    }

    export function formatItalic(text: string): string {
        return `_${text}_`;
    }

    export function formatCode(text: string): string {
        return `\`${text}\``;
    }

    // Convert heading formats (# Heading) to bold text
    export function convertHeadingsToBold(text: string): string {
        if (!text) return "";

        // Replace heading patterns with bold text
        return text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
            return `*${content}*`;
        });
    }

    export function createMarkdownSender(bot: any, useMarkdownV2: boolean = false) {
        return (chatId: number | string, text: string, options: any = {}) => {
            // Process text to handle headings
            const processedText = convertHeadingsToBold(text);

            return bot.sendMessage(chatId, processedText, {
                ...options,
                parse_mode: "Markdown" // Using simpler Markdown mode
            });
        };
    }
    ```

5. **Update Bot Code**

    ```typescript
    // In src/bot/index.ts
    import { createMarkdownSender } from "../utils/markdownFormatter";

    // Create a wrapper for sendMessage with Markdown support
    const sendMarkdownMessage = createMarkdownSender(bot, false);

    // For direct responses
    bot.on("message", async (ctx) => {
        const response = await handleMessage(ctx.text || "");
        await sendMarkdownMessage(ctx.chat.id, response);
    });
    ```

6. **Update AI Response Generation**
    - Update AI prompts to use simple Markdown formatting
    - Instruct the AI to use bold text for headings instead of hash symbols
    - Example instruction:
        ```
        IMPORTANT: For headings, use *bold text* instead of # symbols.
        Telegram doesn't support # for headings.
        Example: Use "*Heading*" instead of "# Heading"
        ```

## Implementation Summary

The feature has been successfully implemented with the following changes:

1. Created a new utility file `src/utils/markdownFormatter.ts` with functions for:

    - Formatting text as bold, italic, code, code blocks, and links
    - Converting heading formats (# Heading) to bold text
    - Creating a wrapper for the sendMessage function that uses the simpler Markdown mode

2. Updated `src/bot/index.ts` to:

    - Import the Markdown formatter utilities
    - Create a wrapper function for sending Markdown messages
    - Update all message sending to use the Markdown wrapper
    - Add test messages to verify Markdown rendering

3. Enhanced the OpenAI service to:

    - Include instructions for simple Markdown formatting in AI prompts
    - Explicitly instruct the AI to use bold text for headings instead of hash symbols
    - Ensure responses use only basic Markdown without escape characters

4. Updated the CoinMarketCap and Wallet services to:
    - Format messages with proper Markdown syntax
    - Remove unnecessary escaping of special characters
    - Enhance readability with bold and italic formatting

All messages sent by the bot now properly display Markdown formatting in Telegram, with bold text, italics, and other formatting elements rendering correctly. Headings are displayed as bold text instead of showing hash symbols.

## Troubleshooting

If you're still seeing formatting issues, try these fixes:

### Issue 1: Heading Symbols (# Heading) Showing in Messages

The basic Markdown mode in Telegram doesn't support heading formats with hash symbols. To fix this:

```typescript
// Add this function to process text before sending
export function convertHeadingsToBold(text: string): string {
    // Replace heading patterns with bold text
    return text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
        return `*${content}*`;
    });
}
```

### Issue 2: Double Escaping

The most common issue is that we're escaping characters that are already escaped or escaping characters that shouldn't be escaped in the current context.

```typescript
// Fix the escapeMarkdown function in src/utils/markdownFormatter.ts
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
```

### Issue 3: Using the Wrong Parse Mode

Try switching from MarkdownV2 to the simpler Markdown mode:

```typescript
// In src/utils/markdownFormatter.ts
export function createMarkdownSender(bot: any) {
    return (chatId: number | string, text: string, options: any = {}) => {
        return bot.sendMessage(chatId, text, {
            ...options,
            parse_mode: "Markdown" // Changed from "MarkdownV2"
        });
    };
}
```

### Issue 4: Direct Testing

Try sending a simple test message directly:

```typescript
// Add this to your code for testing
bot.sendMessage(chatId, "This is *bold* and _italic_ text", { parse_mode: "Markdown" });
```

If the test message renders correctly but your regular messages don't, the issue is likely with how the response text is being formatted.
