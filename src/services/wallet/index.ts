import { WalletService } from "./walletService";

// Export types
export * from "./types";

// Create and initialize wallet service
const walletService = new WalletService();

/**
 * Initialize wallet service with tools and integrations
 */
export function initWalletService(): WalletService {
    return walletService;
}

// Export the wallet service singleton
export { walletService };
