# Tool to Endpoint Mapping

| Feature | Former Tool Name | HTTP Method & Path | Controller |
| --- | --- | --- | --- |
| Reminders | `create_reminder` | POST `/api/reminders` | `RemindersController.createReminder` |
| Reminders | `get_upcoming_reminders` | GET `/api/reminders/upcoming` | `RemindersController.getUpcomingReminders` |
| Reminders | `complete_reminder` | PUT `/api/reminders/{reminderId}/complete` | `RemindersController.updateReminderCompletion` |
| Reminders | `delete_reminder` | DELETE `/api/reminders/{reminderId}` | `RemindersController.deleteReminder` |
| Interests | `track_interest_in_topic` | POST `/api/interests` | `InterestsController.trackInterest` |
| Interests | `get_interests` | GET `/api/interests` | `InterestsController.getInterests` |
| Trello Tasks | `create_task` | POST `/api/tasks` | `TrelloController.createTask` |
| Trello Tasks | `create_multiple_tasks` | POST `/api/tasks/bulk` | `TrelloController.createMultipleTasks` |
| Trello Tasks | `complete_task` | PUT `/api/tasks/{taskId}/complete` | `TrelloController.completeTask` |
| Trello Tasks | `delete_task` | DELETE `/api/tasks/{taskId}` | `TrelloController.deleteTask` |
| Trello Tasks | `list_todos` | GET `/api/tasks` | `TrelloController.listTodos` |
| Finance | `analyze_finances` | POST `/api/finance/analyze` | `FinanceController.analyzeFinances` |
| Finance | `compare_financial_periods` | POST `/api/finance/compare` | `FinanceController.comparePeriods` |
| Exchange Rates | `convert_currency` | POST `/api/exchange/convert` | `ExchangeController.convertCurrency` |
| Crypto | `get_token_data` | POST `/api/crypto/token-data` | `CryptoController.getTokenData` |
| Wallet | `get_wallet_balance` | GET `/api/wallet/balance` | `WalletController.getWalletBalance` |
| Wallet | `get_crypto_holdings` | GET `/api/wallet/holdings` | `CryptoController.getTotalHoldings` |
| Binance | `get_binance_balance` | GET `/api/crypto/binance/balance` | `CryptoController.getBinanceBalance` |
| CoinMarketCap | `get_crypto_price` | POST `/api/coinmarketcap/price` | `CoinMarketCapController.getCryptoPrice` |
| CoinMarketCap | `get_token_details` | POST `/api/coinmarketcap/details` | `CoinMarketCapController.getTokenDetails` |

