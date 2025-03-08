import { BigNumber } from "bignumber.js";
import { BlockchainNetwork } from "../blockchain-types";

/**
 * Token balance interface
 */
export interface TokenBalance {
    symbol: string;
    name: string;
    balance: BigNumber;
    decimals: number;
    contractAddress?: string;
    tokenPrice?: number;
    valueUsd?: number;
}

/**
 * Token info interface for tracking specific tokens
 */
export interface TokenInfo {
    contractAddress: string;
    network: BlockchainNetwork;
    symbol: string;
    name: string;
    decimals: number;
}

/**
 * Wallet data interface
 */
export interface WalletData {
    address: string;
    network: BlockchainNetwork;
    label?: string;
}

/**
 * Wallet with value data
 */
export interface WalletWithValue extends WalletData {
    valueUsd: number;
    tokenBalances: TokenBalance[];
}

/**
 * Wallet report data
 */
export interface WalletReport {
    totalValueUsd: number;
    wallets: WalletWithValue[];
}
