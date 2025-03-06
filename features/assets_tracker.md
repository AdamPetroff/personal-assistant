# Assets Tracker

I want to track my assets, such as stocks, crypto, and other investments. For this I want the system to run a cron job every day at 10:00 AM, which will fetch the current prices of all assets and update their values in the database. Every time it runs, I want to receive a message on telegram about how the assets value has changed since the day before, the last 7 days and last month. In addition, the bot should send me an image of the assets value as a line chart accross time.

## Implementation Plan

### 1. Database Schema

Create new tables in the database to store asset data:

```sql
-- Table to store asset types
CREATE TABLE "Asset" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'crypto', 'stock', 'other'
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table to store asset value history
CREATE TABLE "AssetValue" (
  "id" TEXT PRIMARY KEY,
  "assetId" TEXT NOT NULL REFERENCES "Asset"("id"),
  "value" DECIMAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("assetId", "timestamp")
);

-- Table to store portfolio snapshots
CREATE TABLE "PortfolioSnapshot" (
  "id" TEXT PRIMARY KEY,
  "totalValue" DECIMAL NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Service Implementation

Create a new `assetsTracker.ts` service with the following components:

1. **Asset Management**

    - Add/remove/update assets to track
    - Support for different asset types (crypto, stocks, etc.)
    - Integration with existing services (Binance, CoinMarketCap)

2. **Asset Value Tracking**

    - Fetch current prices for all tracked assets
    - Store historical values in the database
    - Calculate total portfolio value

3. **Reporting**
    - Generate daily/weekly/monthly change reports
    - Format Telegram messages with asset performance
    - Create line chart visualizations

### 3. Chart Generation

Implement chart generation using a library like Chart.js:

1. Install required packages:

    ```
    npm install chart.js canvas
    ```

2. Create a chart generation utility that:
    - Fetches historical data from the database
    - Generates line charts for different time periods
    - Saves charts as images to be sent via Telegram

### 4. Scheduler Integration

Add a new scheduled task to the existing cron job system:

1. Add a new entry in `scheduledMessages.ts` to run daily at 10:00 AM
2. Implement the asset tracking and reporting logic
3. Configure Telegram message delivery with charts

### 5. Implementation Steps

1. **Database Migration (Week 1)**

    - Create new database tables for assets and historical values
    - Update database type definitions

2. **Core Service (Week 1-2)**

    - Implement `AssetsTrackerService` class
    - Add methods for tracking and updating asset values
    - Integrate with existing services (Binance, Wallet, CoinMarketCap)

3. **Chart Generation (Week 2)**

    - Implement chart generation utility
    - Create line chart visualization for asset values
    - Test chart generation with sample data

4. **Scheduler Integration (Week 3)**

    - Add new scheduled task to run daily
    - Implement asset value update and reporting logic
    - Configure Telegram notifications

5. **Testing & Deployment (Week 3)**
    - Test end-to-end functionality
    - Deploy to production environment
    - Monitor initial runs and adjust as needed

### 6. Technical Considerations

1. **Data Storage**

    - Efficient storage of time-series data
    - Indexing for quick retrieval of historical values
    - Regular cleanup of old data points (if needed)

2. **Error Handling**

    - Graceful handling of API failures
    - Retry mechanisms for failed requests
    - Logging and monitoring

3. **Performance**

    - Batch processing for multiple assets
    - Caching of frequently accessed data
    - Optimized database queries

4. **Security**
    - Secure storage of API keys and credentials
    - Validation of input data
    - Protection against unauthorized access
