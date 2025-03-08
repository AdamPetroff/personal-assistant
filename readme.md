# Personal Assistant Bot

A Telegram bot that serves as a personal assistant with various features including task management, cryptocurrency price tracking, and wallet holdings monitoring.

## Features

### Wallet Holdings Feature

The Wallet Holdings Feature allows you to track the token balances and total value of your cryptocurrency wallets across multiple blockchain networks.

#### Capabilities

- Track wallet addresses across multiple blockchain networks (Ethereum, BSC, Polygon, Solana, etc.)
- Fetch token balances for each wallet
- Calculate the total value of wallets in USD
- Generate detailed wallet reports
- Schedule daily wallet reports at 7AM
- Add/remove wallet addresses through Telegram commands

#### Setup

1. Add your blockchain explorer API keys to the `.env` file:

    ```
    ETHERSCAN_API_KEY=your_etherscan_api_key
    BSCSCAN_API_KEY=your_bscscan_api_key
    POLYGONSCAN_API_KEY=your_polygonscan_api_key
    SOLSCAN_API_KEY=your_solscan_api_key
    ARBISCAN_API_KEY=your_arbiscan_api_key
    OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
    SNOWTRACE_API_KEY=your_snowtrace_api_key
    BASESCAN_API_KEY=your_basescan_api_key
    ```

2. Add your wallet addresses to the `.env` file using the following format:

    ```
    WALLET_NETWORK_LABEL=address
    ```

    Examples:

    ```
    WALLET_ETHEREUM_MAIN=0x123...
    WALLET_BSC_DEFI=0x456...
    WALLET_SOLANA_GAMING=abc...
    ```

#### Usage

You can interact with the Wallet Holdings Feature through Telegram commands:

- **Add a wallet**: "Add my Ethereum wallet 0x123... as Main"
- **Remove a wallet**: "Remove my Ethereum wallet 0x123..."
- **List wallets**: "Show my tracked wallets"
- **Get wallet value**: "What's the value of my Ethereum wallet?"
- **Get all wallets value**: "Show me all my wallet holdings"

The bot will also send you a daily report of your wallet holdings at 7AM.

## Other Features

- Task management with Trello integration
- Cryptocurrency price tracking
- Daily learning topics

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`
4. Build the project: `npm run build`
5. Start the bot: `npm start`

## Development

- Run in development mode: `npm run dev`

## Testing

This project uses Jest for testing. To run the tests:

- Run all tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run tests with coverage report: `npm run test:coverage`
- Run specific test file: `npm test -- <file-pattern>`

Example:

```bash
# Run only the Langchain service tests
npm run test-langchain

# Run only the Crypto service tests
npm run test-crypto

# Run all files with "crypto" in their name
npm test -- crypto
```

### Writing Tests

When adding new features, please include tests to ensure functionality continues to work as expected. The project follows a standard Jest testing structure:

#### Test Examples

##### Crypto Service Tests

The Crypto Service tests verify functionality like:

- Network ID mapping between blockchain networks and their IDs
- Token data fetching from different blockchain networks
- Error handling for invalid token addresses
- Cache mechanism for repeated token data requests

This ensures the crypto service correctly handles blockchain data across multiple networks.
