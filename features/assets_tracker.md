# Assets Tracker

I want to be able to start tracking my assets in the database.
For now, I want to be able to track my crypto assets in my wallets.
The assets are in multiple wallets and on multiple chains. I should be able to send a message to the bot that I want to start tracking assets on a particular wallet address. There I should also be able to say that I want to start tracking a particular asset - I will provide the token symbol and the network it is on. The system should be able to use the coinmarketcap service to get the remaining details of the asset such as contract address, network id, etc.
After this the system should be able to track how much of the added tokens are on the added wallets.

## Analysis

### Desired Outcome

The system should allow users to track cryptocurrency assets across multiple wallets and blockchain networks. When a user adds a wallet address or a token to track, the system should automatically monitor all added tokens across all added wallets. The key components include:

1. Adding wallet addresses to track (with optional labels)
2. Adding tokens to track by specifying symbol and network
3. Using CoinMarketCap API to fetch complete token details
4. Querying blockchain networks to get token balances in wallets
5. Storing and retrieving this information for the user

### Current State

- The project already has a `CoinMarketCapService` that can fetch token prices and information
- There's a `WalletService` with blockchain network support and wallet balance functionality
- However, there are no database tables for storing crypto assets and wallet information
- No implementation exists for the user to request tracking of specific assets in specific wallets

### Future Extensibility

While the current feature focuses on tracking cryptocurrency assets in blockchain wallets, the system should be designed with extensibility in mind to accommodate different asset types in the future, such as:

- Binance exchange account holdings
- Bank account balances
- Stock portfolios

This extensibility should be built into the architecture from the beginning to avoid major refactoring later.

### Tasks

#### Task 1: Database Schema Implementation

Create new database tables to store:

- Crypto assets (symbol, name, contract address, network, decimals)
- Wallet addresses (address, network, label)
- Asset-wallet tracking relationships (which assets are being tracked in which wallets)
- Asset balance history (for tracking changes over time)

The schema should use an extensible design with:

- An asset_type field to distinguish between different types of assets (crypto, exchange, bank, etc.)
- A source_type field to distinguish between different sources (blockchain wallet, exchange account, bank account, etc.)
- Flexible metadata fields to store type-specific information

#### Task 2: Asset Management Service

Implement a service that:

- Allows adding new assets to track with minimal information (symbol and network)
- Uses the existing CoinMarketCap service to fetch complete token details
- Stores the asset information in the database
- Provides methods to list and manage tracked assets

Design the service with interfaces and abstractions that will allow:

- Adding new asset types in the future
- Plugging in different data sources for asset information
- Standardizing asset data across different types

#### Task 3: Wallet Tracking Service

Implement a service that:

- Allows adding wallet addresses to track
- Associates wallets with the assets to be tracked
- Uses the existing wallet service to query balances
- Stores wallet balances for tracked assets
- Provides methods to list wallets and their tracked asset balances

Design this as a more general "Asset Source" service that can be extended to:

- Track different types of asset sources (wallets, exchange accounts, bank accounts)
- Use different methods to query balances based on source type
- Maintain a consistent interface regardless of the underlying source

#### Task 4: User Interface Integration

Implement a comprehensive set of commands for the bot, with corresponding LLM tools that reuse the same underlying logic:

##### Asset Commands:

- `/asset_add <symbol> <network>` - Add a new asset to track
- `/asset_remove <symbol> <network>` - Remove an asset from tracking
- `/asset_list` - List all assets being tracked
- `/asset_details <symbol>` - Show detailed information about a specific asset

##### Wallet Commands:

- `/wallet_add <address> <network> [label]` - Add a new wallet to track
- `/wallet_remove <address>` - Remove a wallet from tracking
- `/wallet_list` - List all wallets being tracked
- `/wallet_details <address>` - Show detailed information about a specific wallet

##### Balance Commands:

- `/balance` - Show balances of all tracked assets across all wallets
- `/balance_by_asset <symbol>` - Show balance of a specific asset across all wallets
- `/balance_by_wallet <address>` - Show balances of all assets in a specific wallet
- `/balance_history <symbol> [timeframe]` - Show historical balance for an asset

For each command, create a corresponding LangChain tool that:

- Calls the same underlying service functions as the command
- Enables natural language interaction for the same functionality
- Follows a consistent naming pattern (e.g., `addAssetToTrack` for `/asset_add`)

This approach ensures:

- No duplication of business logic between commands and tools
- Consistent behavior regardless of interface method
- Support for both structured commands and natural language queries
- Extensibility for future asset types and sources
- Complete add/remove/list operations for all models
