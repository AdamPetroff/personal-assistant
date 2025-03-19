/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

import type { ColumnType } from "kysely";

export type Blockchainnetwork = "arbitrum" | "avalanche" | "base" | "bsc" | "ethereum" | "optimism" | "polygon" | "solana";

export type Currency = "CZK" | "EUR" | "USD";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Json = JsonValue;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [x: string]: JsonValue | undefined;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Numeric = ColumnType<string, number | string, number | string>;

export type Taskstatus = "DOING" | "DONE" | "TODO";

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface CryptoPortfolioReport {
  createdAt: Generated<Timestamp>;
  data: Json;
  exchangeValueUsd: Numeric;
  id: Generated<string>;
  timestamp: Generated<Timestamp>;
  totalValueUsd: Numeric;
  walletsValueUsd: Numeric;
}

export interface FinanceSource {
  accountNumber: string | null;
  createdAt: Generated<Timestamp>;
  currency: Generated<Currency>;
  description: string | null;
  id: Generated<string>;
  name: string;
  type: string;
  updatedAt: Timestamp;
}

export interface FinanceStatement {
  accountBalance: Numeric;
  accountBalanceUsd: Numeric;
  createdAt: Generated<Timestamp>;
  data: Json;
  fileName: string | null;
  financeSourceId: string;
  id: Generated<string>;
  statementDate: Timestamp;
  updatedAt: Timestamp;
}

export interface FinanceTransaction {
  amount: Numeric;
  category: string;
  createdAt: Generated<Timestamp>;
  currency: Currency;
  financeStatementId: string;
  id: Generated<string>;
  name: string;
  updatedAt: Generated<Timestamp>;
  usdAmount: Numeric;
}

export interface Interest {
  createdAt: Generated<Timestamp>;
  description: string | null;
  id: Generated<string>;
  topic: string;
  updatedAt: Timestamp;
}

export interface Reminder {
  completed: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  description: string | null;
  id: Generated<string>;
  reminderTime: Timestamp;
  title: string;
  updatedAt: Timestamp;
}

export interface Task {
  createdAt: Generated<Timestamp>;
  description: string | null;
  dueDate: Timestamp | null;
  id: Generated<string>;
  status: Taskstatus;
  title: string;
  updatedAt: Timestamp;
}

export interface Token {
  contractAddress: string;
  createdAt: Generated<Timestamp>;
  decimals: number;
  id: Generated<string>;
  name: string;
  network: Blockchainnetwork;
  symbol: string;
  updatedAt: Generated<Timestamp>;
}

export interface Wallet {
  address: string;
  createdAt: Generated<Timestamp>;
  id: Generated<string>;
  label: string | null;
  network: Blockchainnetwork;
  updatedAt: Generated<Timestamp>;
}

export interface DB {
  crypto_portfolio_report: CryptoPortfolioReport;
  finance_source: FinanceSource;
  finance_statement: FinanceStatement;
  finance_transaction: FinanceTransaction;
  interest: Interest;
  reminder: Reminder;
  task: Task;
  token: Token;
  wallet: Wallet;
}
