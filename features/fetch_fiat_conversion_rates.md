# Fetch Fiat Conversion Rates

- I want to be able to accurately convert between CZK, USD and EUR.

- I want to receive correct FIAT amounts for my crypto and other holdings. Instead of hardcoded estimated rates, I want to fetch the current rates from an API.

## Analysis

The current implementation uses hardcoded exchange rates for fiat currencies in the `BinanceService` class. Specifically, there's a `FIAT_USD_RATES` constant that maps currency codes to their USD exchange rates. These rates are static and need to be manually updated.

Key findings:

1. The application already has a structure for fetching cryptocurrency prices via the `CoinMarketCapService`.
2. There's no dedicated service for fetching fiat currency exchange rates.
3. The project uses axios for HTTP requests and has BigNumber.js for precise number handling.
4. The current implementation only supports conversion to USD, not between arbitrary fiat currencies.
5. The application needs to support at least CZK, USD, and EUR conversions.

## Implementation Plan

1. **Create a new Exchange Rate Service**

    - Implement a new service class `ExchangeRateService` in `src/services/exchangeRate.ts`
    - Use a reliable and free/affordable exchange rate API (e.g., ExchangeRate-API, Open Exchange Rates, or Fixer.io)
    - Add necessary API keys to environment variables and constants

2. **Implement Core Functionality**

    - Create methods to fetch latest exchange rates
    - Implement caching mechanism similar to CoinMarketCapService to minimize API calls
    - Support conversion between any two currencies, not just to USD
    - Handle error cases gracefully

3. **Update Existing Code**

    - Modify BinanceService to use the new ExchangeRateService instead of hardcoded rates
    - Update the getFiatUsdValue method to use real-time rates
    - Ensure backward compatibility

4. **Add New Features**

    - Implement direct conversion between CZK, USD, and EUR
    - Create utility functions for formatting currency values with appropriate symbols
    - Add support for displaying values in multiple currencies

5. **Testing and Integration**

    - Test the service with various currency pairs
    - Verify accuracy of conversions
    - Ensure the service gracefully handles API failures
    - Update any UI components to display multi-currency values

6. **Documentation**
    - Document the new service and its usage
    - Update any relevant documentation about currency handling

## Implementation Summary

The fiat conversion rates feature has been successfully implemented with the following changes:

1. **Created a new ExchangeRateService**

    - Implemented in `src/services/exchangeRate.ts`
    - Uses the free ExchangeRate API (exchangerate-api.com)
    - Includes caching mechanism to minimize API calls (1-hour cache)
    - Supports conversion between any currency pairs

2. **Updated Environment Configuration**

    - Added `EXCHANGE_RATE_API_KEY` and `EXCHANGE_RATE_API_FREE` to environment variables
    - Updated constants.ts to include the new environment variables

3. **Enhanced BinanceService**

    - Replaced hardcoded FIAT_USD_RATES with dynamic exchange rate fetching
    - Updated `getFiatUsdValue` method to use real-time rates
    - Added support for CZK currency as requested
    - Added new methods for multi-currency display:
        - `formatMultiCurrencyReport`: Shows balances in multiple currencies
        - `getTotalBalanceInCurrency`: Gets total balance in any currency

4. **Added Currency Formatting**
    - Implemented proper currency symbol display (€, $, Kč, etc.)
    - Added locale-aware number formatting
    - Positioned currency symbols according to convention (e.g., "$100" vs "100 Kč")

The implementation now allows accurate conversion between CZK, USD, EUR, and other currencies, with real-time exchange rates instead of hardcoded estimates.

## AI Integration

The currency conversion functionality has been integrated with the AI assistant through the following additions:

1. **Added Currency Conversion Tool**

    - Implemented a new `convert_currency` tool in the OpenAI service
    - The tool allows the AI to convert between any supported currencies
    - Parameters include:
        - `amount`: The amount to convert
        - `from_currency`: The source currency code (e.g., USD, EUR, CZK)
        - `to_currency`: The target currency code (e.g., USD, EUR, CZK)

2. **Registered the Tool with the AI**

    - Added `registerCurrencyConversionIntent()` function to register the tool
    - Updated the application startup process to register the currency conversion intent

3. **Example Usage**
    - Users can now ask the AI questions like:
        - "Convert 100 USD to EUR"
        - "How much is 1000 CZK in USD?"
        - "What's the exchange rate between EUR and CZK?"

The AI will use the real-time exchange rates to provide accurate currency conversions, enhancing the financial assistant capabilities of the application.
