import { Request, Response } from "express";
import { TokenService } from "../services/wallet/tokenService";
import { BlockchainNetwork } from "../services/blockchain-types";
import { logger } from "../utils/logger";

/**
 * Controller for managing tokens
 */
export class TokenController {
    private tokenService: TokenService;

    constructor() {
        this.tokenService = new TokenService();
    }

    /**
     * Get all tokens
     */
    async getAllTokens(req: Request, res: Response): Promise<void> {
        try {
            const tokens = await this.tokenService.getAllTokens();
            res.json({ success: true, data: tokens });
        } catch (error) {
            logger.error("Error getting all tokens:", error);
            res.status(500).json({ success: false, error: "Failed to get tokens" });
        }
    }

    /**
     * Get tokens by network
     */
    async getTokensByNetwork(req: Request, res: Response): Promise<void> {
        try {
            const { network } = req.params;

            // Validate network
            if (!Object.values(BlockchainNetwork).includes(network as BlockchainNetwork)) {
                res.status(400).json({ success: false, error: "Invalid network" });
                return;
            }

            const tokens = await this.tokenService.getTokensByNetwork(network as BlockchainNetwork);
            res.json({ success: true, data: tokens });
        } catch (error) {
            logger.error("Error getting tokens by network:", error);
            res.status(500).json({ success: false, error: "Failed to get tokens" });
        }
    }

    /**
     * Add a new token
     */
    async addToken(req: Request, res: Response): Promise<void> {
        try {
            const { contractAddress, network, symbol, name, decimals } = req.body;

            // Validate required fields
            if (!contractAddress || !network || !symbol || !name || decimals === undefined) {
                res.status(400).json({
                    success: false,
                    error: "Missing required fields: contractAddress, network, symbol, name, decimals"
                });
                return;
            }

            // Validate network
            if (!Object.values(BlockchainNetwork).includes(network)) {
                res.status(400).json({ success: false, error: "Invalid network" });
                return;
            }

            // Validate decimals
            if (typeof decimals !== "number" || decimals < 0 || !Number.isInteger(decimals)) {
                res.status(400).json({ success: false, error: "Decimals must be a non-negative integer" });
                return;
            }

            const token = await this.tokenService.addToken({
                contractAddress,
                network,
                symbol,
                name,
                decimals
            });

            res.status(201).json({ success: true, data: token });
        } catch (error) {
            logger.error("Error adding token:", error);

            // Handle duplicate token error
            if (error instanceof Error && error.message.includes("already exists")) {
                res.status(409).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: "Failed to add token" });
        }
    }

    /**
     * Update a token
     */
    async updateToken(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { contractAddress, network, symbol, name, decimals } = req.body;

            // Validate that at least one field is provided
            if (!contractAddress && !network && !symbol && !name && decimals === undefined) {
                res.status(400).json({
                    success: false,
                    error: "At least one field must be provided to update"
                });
                return;
            }

            // Validate network if provided
            if (network && !Object.values(BlockchainNetwork).includes(network)) {
                res.status(400).json({ success: false, error: "Invalid network" });
                return;
            }

            // Validate decimals if provided
            if (
                decimals !== undefined &&
                (typeof decimals !== "number" || decimals < 0 || !Number.isInteger(decimals))
            ) {
                res.status(400).json({ success: false, error: "Decimals must be a non-negative integer" });
                return;
            }

            const token = await this.tokenService.updateToken(id, {
                contractAddress,
                network,
                symbol,
                name,
                decimals
            });

            res.json({ success: true, data: token });
        } catch (error) {
            logger.error("Error updating token:", error);
            res.status(500).json({ success: false, error: "Failed to update token" });
        }
    }

    /**
     * Delete a token
     */
    async deleteToken(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await this.tokenService.deleteToken(id);

            if (success) {
                res.json({ success: true, message: "Token deleted successfully" });
            } else {
                res.status(404).json({ success: false, error: "Token not found" });
            }
        } catch (error) {
            logger.error("Error deleting token:", error);
            res.status(500).json({ success: false, error: "Failed to delete token" });
        }
    }
}
