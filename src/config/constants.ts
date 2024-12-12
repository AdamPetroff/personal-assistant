import dotenv from "dotenv";
import { cleanEnv, str } from "envalid";

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
    TWILIO_AUTH_TOKEN: str()
});

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
