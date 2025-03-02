import dotenv from "dotenv";
import { cleanEnv, str, bool } from "envalid";
import { PrismaClient } from "@prisma/client";

// Load environment variables from .env file
dotenv.config();

// Validate and clean environment variables
export const env = cleanEnv(process.env, {
    TELEGRAM_BOT_TOKEN: str(),
    TRELLO_API_KEY: str(),
    TRELLO_TOKEN: str(),
    TRELLO_BOARD_ID: str(),
    ANTHROPIC_API_KEY: str(),
    OPENAI_API_KEY: str(),
    TWILIO_ACCOUNT_SID: str(),
    TWILIO_AUTH_TOKEN: str(),

    // Database URL
    DATABASE_URL: str(),

    // Blockchain explorer API keys (optional but validated if present)
    ETHERSCAN_API_KEY: str({ default: "" }),
    BSCSCAN_API_KEY: str({ default: "" }),
    POLYGONSCAN_API_KEY: str({ default: "" }),
    SOLSCAN_API_KEY: str({ default: "" }),
    ARBISCAN_API_KEY: str({ default: "" }),
    OPTIMISTIC_ETHERSCAN_API_KEY: str({ default: "" }),
    SNOWTRACE_API_KEY: str({ default: "" }),
    BASESCAN_API_KEY: str({ default: "" }),

    // CoinMarketCap API key
    COIN_MARKET_CAP_API_KEY: str(),

    // Binance API credentials
    BINANCE_API_KEY: str({ default: "" }),
    BINANCE_API_SECRET: str({ default: "" }),

    // Exchange Rate API credentials
    EXCHANGE_RATE_API_KEY: str({ default: "" }),
    EXCHANGE_RATE_API_FREE: bool({ default: true })
});

// Initialize Prisma client
export const prisma = new PrismaClient();

// Export constants
export const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

export const LINEAR_LABELS = {
    TASK: "task",
    REMINDER: "reminder",
    URGENT: "urgent",
    ROUTINE: "routine"
};

export const LINEAR_CUSTOM_FIELDS = {
    DUE_DATE: "Due Date",
    REMINDER_TIME: "Reminder Time"
};
