import axios from "axios";
import { logger } from "../utils/logger";
import { env } from "../config/constants";
import BigNumber from "bignumber.js";

// Interface for exchange rate data
export interface ExchangeRateData {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
}

/**
 * Service for fetching and managing fiat currency exchange rates
 */
export class ExchangeRateService {
    private readonly baseUrl = "https://api.exchangerate-api.com/v4/latest";
    private readonly apiKey = env.EXCHANGE_RATE_API_KEY || "";

    // Cache to store recently fetched rates (valid for 1 hour)
    private ratesCache: Map<string, { data: ExchangeRateData; timestamp: number }> = new Map();
    private readonly cacheTTL = 60 * 60 * 1000; // 1 hour in milliseconds

    constructor() {
        if (!this.apiKey && !env.EXCHANGE_RATE_API_FREE) {
            logger.warn("Exchange Rate API key not provided. Using free tier with limited functionality.");
        }
    }

    /**
     * Get latest exchange rates for a base currency
     */
    async getExchangeRates(baseCurrency: string = "USD"): Promise<ExchangeRateData> {
        const normalizedBase = baseCurrency.toUpperCase();

        // Check cache first
        const cachedData = this.ratesCache.get(normalizedBase);
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheTTL) {
            return cachedData.data;
        }

        try {
            let url = "";

            // Use appropriate API endpoint based on whether we have an API key
            if (this.apiKey) {
                url = `${this.baseUrl}/${normalizedBase}?api_key=${this.apiKey}`;
            } else {
                // Free tier endpoint
                url = `${this.baseUrl}/${normalizedBase}`;
            }

            const response = await axios.get(url);

            if (response.data && response.data.rates) {
                const rateData: ExchangeRateData = {
                    base: normalizedBase,
                    rates: response.data.rates,
                    timestamp: Date.now()
                };

                // Update cache
                this.ratesCache.set(normalizedBase, {
                    data: rateData,
                    timestamp: Date.now()
                });

                return rateData;
            } else {
                throw new Error("Invalid response format from Exchange Rate API");
            }
        } catch (error) {
            logger.error(`Failed to fetch exchange rates for ${normalizedBase}:`, error);

            // If we have cached data, return it even if expired
            if (cachedData) {
                logger.info(`Using expired exchange rate data for ${normalizedBase}`);
                return cachedData.data;
            }

            throw new Error(`Failed to fetch exchange rates for ${normalizedBase}`);
        }
    }

    /**
     * Convert amount from one currency to another
     */
    async convertCurrency(
        amount: number | string | BigNumber,
        fromCurrency: string,
        toCurrency: string
    ): Promise<BigNumber> {
        const amountBN = new BigNumber(amount);

        if (amountBN.isNaN() || amountBN.isZero()) {
            return new BigNumber(0);
        }

        // If currencies are the same, no conversion needed
        if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
            return amountBN;
        }

        try {
            // Get exchange rates with USD as base for consistency
            const rates = await this.getExchangeRates("USD");

            // If either currency is USD, conversion is simpler
            if (fromCurrency.toUpperCase() === "USD") {
                const toRate = rates.rates[toCurrency.toUpperCase()];
                if (!toRate) {
                    throw new Error(`Exchange rate not found for ${toCurrency}`);
                }
                return amountBN.times(toRate);
            }

            if (toCurrency.toUpperCase() === "USD") {
                const fromRate = rates.rates[fromCurrency.toUpperCase()];
                if (!fromRate) {
                    throw new Error(`Exchange rate not found for ${fromCurrency}`);
                }
                return amountBN.dividedBy(fromRate);
            }

            // For non-USD pairs, convert through USD
            const fromRate = rates.rates[fromCurrency.toUpperCase()];
            const toRate = rates.rates[toCurrency.toUpperCase()];

            if (!fromRate || !toRate) {
                throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
            }

            // Convert from source currency to USD, then from USD to target currency
            return amountBN.dividedBy(fromRate).times(toRate);
        } catch (error) {
            logger.error(`Currency conversion failed from ${fromCurrency} to ${toCurrency}:`, error);
            throw new Error(`Failed to convert from ${fromCurrency} to ${toCurrency}`);
        }
    }

    /**
     * Format amount with currency symbol
     */
    formatCurrencyAmount(amount: number | BigNumber, currency: string): string {
        const amountBN = new BigNumber(amount);
        const currencyUpper = currency.toUpperCase();

        // Define currency symbols and formatting options
        const currencySymbols: Record<string, string> = {
            USD: "$",
            EUR: "€",
            GBP: "£",
            JPY: "¥",
            CZK: "Kč",
            AUD: "A$",
            CAD: "C$",
            CHF: "CHF",
            CNY: "¥",
            RUB: "₽"
        };

        // Get symbol or use currency code if no symbol defined
        const symbol = currencySymbols[currencyUpper] || currencyUpper;

        // Format with appropriate decimal places
        // JPY typically shows no decimal places
        const decimalPlaces = currencyUpper === "JPY" ? 0 : 2;

        const formattedAmount = amountBN.toFormat(decimalPlaces);

        // Position symbol based on currency convention
        if (["USD", "AUD", "CAD", "HKD"].includes(currencyUpper)) {
            return `${symbol}${formattedAmount}`;
        } else if (currencyUpper === "CZK") {
            return `${formattedAmount} ${symbol}`;
        } else {
            return `${symbol}${formattedAmount}`;
        }
    }
}

// Create and export singleton instance
export const exchangeRateService = new ExchangeRateService();
