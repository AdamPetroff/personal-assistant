# Wallet Holdings Feature

## Description

I want to be able to fetch the current token balances for my wallet. The bot should be able to fetch the amounts of tokens held in my wallet or wallets, and return the worth of the wallet in USD.
Then the TG bot should be able to send me a message with the current wallet worth in USD either when I ask for it, or every day at 7AM.

## Analysis

Based on the current codebase, implementing the wallet holdings feature requires several components:

### Current Capabilities

- CoinMarketCapService already exists for fetching token prices
- Scheduling system is in place for daily messages
- OpenAI service handles intent parsing and response generation
- Architecture supports adding new tools/functions

### Missing Components

- No wallet integration service to fetch token balances
- No storage mechanism for wallet addresses
- No functionality to calculate total wallet value in USD
- No intent handling for wallet-related commands

## Implementation Plan

- **Create a Wallet Service**

    - Implement service to connect to blockchain APIs (Etherscan, BSCScan, etc.)
    - Add functions to fetch token balances for given wallet addresses
    - Support multiple blockchains (Ethereum, BSC, Solana, etc.)

- **Wallet Storage**

    - Create mechanism to store wallet addresses (could use Trello cards with special label)
    - Allow users to add/remove wallet addresses through the bot

- **Value Calculation**

    - Integrate with CoinMarketCapService to convert token amounts to USD
    - Implement aggregation logic to calculate total wallet value

- **Bot Integration**

    - Add new intent parsing for wallet commands
    - Register new tools with OpenAI service for wallet operations
    - Create response templates for wallet balance reports

- **Scheduled Reporting**

    - Add new scheduled message for daily wallet reports at 7AM
    - Format wallet report in a clear, readable way

- **Error Handling**
    - Implement proper error handling for API failures
    - Add fallback mechanisms when certain tokens can't be priced

## Technical Considerations

- API keys needed for blockchain explorers (Etherscan, BSCScan, etc.)
- Consider rate limits of these APIs
- For ERC-20 tokens, need to query token contract addresses
- Some tokens might not have price data in CoinMarketCap

## Implementation Summary

The Wallet Holdings Feature has been successfully implemented with the following components:

### 1. Wallet Service (`src/services/wallet.ts`)

- Created a comprehensive `WalletService` class that:
    - Connects to multiple blockchain APIs (Etherscan, BSCScan, Polygonscan, Solscan, etc.)
    - Fetches token balances for both ERC-20/BEP-20 tokens and native tokens (ETH, BNB, MATIC, SOL, etc.)
    - Supports 8 blockchain networks: Ethereum, BSC, Polygon, Solana, Arbitrum, Optimism, Avalanche, and Base
    - Calculates USD values by integrating with the existing CoinMarketCapService
    - Formats detailed wallet reports with token holdings and values

### 2. Wallet Storage

- Implemented an in-memory storage mechanism for wallet addresses
- Added support for loading wallet addresses from environment variables using a standardized format:
    ```
    WALLET_NETWORK_LABEL=address
    ```
- Created methods to add/remove wallet addresses programmatically

### 3. OpenAI Tool Integration

Registered 5 new tools with the OpenAI service:

1. `add_wallet`: Add a wallet address to track
2. `remove_wallet`: Remove a tracked wallet address
3. `list_wallets`: List all tracked wallet addresses
4. `get_wallet_value`: Get the value of a specific wallet
5. `get_all_wallets_value`: Get the value of all wallets

### 4. Scheduled Reporting

- Added a new scheduled message that runs daily at 7AM to send wallet reports
- Implemented a formatted wallet report that shows:
    - Total wallet value in USD
    - Individual wallet values
    - Top token holdings for each wallet (sorted by value)
    - Summary of remaining tokens if there are many

### 5. Error Handling

- Implemented comprehensive error handling for API failures
- Added fallback mechanisms when token prices can't be fetched
- Included detailed logging for troubleshooting

### 6. Configuration

- Updated `.env` file with placeholders for blockchain explorer API keys
- Added validation for new environment variables in `constants.ts`
- Created a README with setup instructions and usage examples

## Usage

Users can interact with the Wallet Holdings Feature through natural language commands:

- **Add a wallet**: "Add my Ethereum wallet 0x123... as Main"
- **Remove a wallet**: "Remove my Ethereum wallet 0x123..."
- **List wallets**: "Show my tracked wallets"
- **Get wallet value**: "What's the value of my Ethereum wallet?"
- **Get all wallets value**: "Show me all my wallet holdings"

The bot will also automatically send a daily wallet holdings report at 7AM.

## Future Improvements

Potential enhancements for the future:

1. Add support for more blockchain networks (e.g. Cardano, Polkadot)
2. Implement persistent storage for wallet addresses (e.g. database)
3. Add historical tracking of wallet values over time
4. Create price alerts for significant changes in wallet value
5. Implement custom reporting schedules per user
6. Add support for NFT valuation
7. Use wallets in .env to autopopulate the bot, there can be multiple addresses per network separated by commas
