import dotenv from "dotenv";
import { cleanEnv, str, bool, num } from "envalid";

// Load environment variables from .env file
dotenv.config();

// Validate and clean environment variables
export const env = cleanEnv(process.env, {
    PORT: num({ default: 3000 }),

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

    // Gmail API credentials
    GMAIL_CLIENT_ID: str({ default: "" }),
    GMAIL_CLIENT_SECRET: str({ default: "" }),
    GMAIL_REFRESH_TOKEN: str({ default: "" }),
    GMAIL_REDIRECT_URI: str({ default: "https://developers.google.com/oauthplayground" }),

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

    // Exchange Rate API
    EXCHANGE_RATE_API_KEY: str({ default: "" }),
    EXCHANGE_RATE_API_FREE: bool({ default: true }),

    // S3 Storage Configuration
    AWS_ACCESS_KEY_ID: str({ default: "" }),
    AWS_SECRET_ACCESS_KEY: str({ default: "" }),
    AWS_ENDPOINT_URL_S3: str({ default: "" }),
    AWS_REGION: str({ default: "auto" }),
    BUCKET_NAME: str({ default: "" }),

    // PDF Password
    PDF_PASSWORD: str({ default: "" })
});

// Export individual constants for easier access
export const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

// Gmail API Constants
export const GMAIL_CONFIG = {
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    redirectUri: env.GMAIL_REDIRECT_URI
};

// S3 Storage Constants
export const S3_CONFIG = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    endpointUrl: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    bucketName: env.BUCKET_NAME
};

export const LINEAR_LABELS = {
    TASK: "task",
    REMINDER: "reminder",
    URGENT: "urgent",
    ROUTINE: "routine"
};
