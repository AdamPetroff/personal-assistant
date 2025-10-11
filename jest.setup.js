// Mock the environment variables
process.env.OPENAI_API_KEY = "test-api-key";
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TRELLO_API_KEY = "test-key";
process.env.TRELLO_TOKEN = "test-token";
process.env.TRELLO_BOARD_ID = "test-board-id";
process.env.ANTHROPIC_API_KEY = "test-api-key";
process.env.DATABASE_URL = "test-db-url";
process.env.COIN_MARKET_CAP_API_KEY = "test-api-key";
process.env.TWILIO_ACCOUNT_SID = "test-sid";
process.env.TWILIO_AUTH_TOKEN = "test-token";
// Add environment variables for blockchain explorer tests
process.env.SCAN_API_KEY = "test-scan-api-key";
process.env.SOLSCAN_API_KEY = "test-solscan-key";

// Set longer timeout for tests that involve API calls
jest.setTimeout(30000);
