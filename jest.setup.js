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
// Add environment variables for crypto service tests
process.env.ETHERSCAN_API_KEY = "test-etherscan-key";
process.env.BSCSCAN_API_KEY = "test-bscscan-key";
process.env.POLYGONSCAN_API_KEY = "test-polygonscan-key";
process.env.SOLSCAN_API_KEY = "test-solscan-key";
process.env.ARBISCAN_API_KEY = "test-arbiscan-key";
process.env.OPTIMISTIC_ETHERSCAN_API_KEY = "test-optimistic-key";
process.env.SNOWTRACE_API_KEY = "test-snowtrace-key";
process.env.BASESCAN_API_KEY = "test-basescan-key";

// Set longer timeout for tests that involve API calls
jest.setTimeout(30000);
