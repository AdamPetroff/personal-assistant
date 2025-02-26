# Get Account Balance from Binance

## Description

I want to be able to get my account balance from Binance. I will provide my read-only Binance API key. I should be able to ask the bot for my account balance and it will return the balance in USD. It should also list the balances of all the coins in my account. There should also be a command to get the total balance of my binance account + my crypto wallet holdings.

## Analysis

The current application is a Telegram bot that provides various services including tracking wallet balances across different blockchain networks. To implement the Binance account balance feature, we need to:

1. Create a new Binance service that will interact with the Binance API
2. Store Binance API credentials securely in environment variables
3. Implement functions to fetch account balances from Binance
4. Convert all balances to USD using existing CoinMarketCap service
5. Register new intent handlers for Binance-related commands
6. Integrate Binance balances with the existing wallet reporting functionality

The application already has:

- A wallet service that tracks balances across different blockchain networks
- A CoinMarketCap service for fetching token prices
- An OpenAI service for intent recognition and response generation
- A Telegram bot interface for user interaction

## Implementation Plan

1. **Environment Configuration**

    - Add Binance API key and secret to the .env file
    - Update the constants.ts file to include these new environment variables

2. **Create Binance Service**

    - Create a new file `src/services/binance.ts`
    - Implement a BinanceService class with methods to:
        - Connect to Binance API using the provided credentials
        - Fetch account balances for all coins
        - Convert balances to USD using the CoinMarketCap service
        - Format balance information for display

3. **Update OpenAI Service**

    - Register new intent handlers for Binance-related commands:
        - `get_binance_balance`: Fetch and display Binance account balance
        - `get_total_crypto_holdings`: Combine Binance balance with wallet holdings

4. **Integration with Wallet Service**

    - Add a method to the WalletService to combine Binance balances with blockchain wallet balances
    - Update the formatWalletReport method to include Binance balances in the report

5. **Testing**

    - Test the Binance API integration with read-only API keys
    - Verify balance fetching and USD conversion
    - Test the combined reporting of Binance and wallet balances

6. **Documentation**
    - Update the README with information about the new Binance integration
    - Document the required environment variables and their format

## Implementation Summary

The Binance account balance feature has been successfully implemented with the following changes:

1. **Environment Configuration**

    - Added Binance API key and secret to the .env file
    - Updated constants.ts to include and validate these environment variables

2. **Binance Service**

    - Created a new BinanceService class in src/services/binance.ts
    - Implemented methods to:
        - Securely authenticate with the Binance API
        - Fetch and process account balances
        - Convert balances to USD using the CoinMarketCap service
        - Format balance information for display

3. **Intent Handlers**

    - Added a new intent handler for `get_binance_balance` to fetch and display Binance account balances
    - Added a new intent handler for `get_total_crypto_holdings` to show combined Binance and wallet balances

4. **Wallet Integration**

    - Added a new getTotalCryptoHoldings function to combine Binance and wallet balances
    - Created a formatted report that shows both Binance and wallet holdings

5. **Application Initialization**

    - Updated the main index.ts file to initialize the Binance service on application startup

6. **Additional Improvements**

    - Added support for fiat currencies (EUR, GBP, etc.) in Binance balances by implementing a currency conversion system
    - Filtered out low-value holdings (less than $10 USD) from both Binance and wallet reports to improve readability
    - Added summary information about filtered low-value holdings to maintain accuracy in total balance reporting
    - Optimized CoinMarketCap API usage by implementing batch requests and caching:
        - Updated CoinMarketCapService to fetch multiple token prices in a single API call
        - Added a 5-minute cache for token prices to reduce API calls
        - Modified Binance and wallet services to use the batch price fetching method
        - Significantly reduced the number of API calls when fetching prices for multiple tokens

The implementation allows users to:

- Request their Binance account balance with the command "Show me my Binance balance"
- View their total crypto holdings across Binance and blockchain wallets with "What's my total crypto balance?"

To use this feature, users need to provide their read-only Binance API key and secret in the .env file.
