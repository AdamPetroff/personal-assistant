import { BlockchainNetwork } from "../blockchain-types";
import { TokenRepository, TokenModel } from "../database/repositories/TokenRepository";
import { TokenInfo } from "./types";

/**
 * Service for managing tokens
 */
export class TokenService {
    private tokenRepository: TokenRepository;

    constructor() {
        this.tokenRepository = new TokenRepository();
    }

    /**
     * Get all tokens
     */
    async getAllTokens(): Promise<TokenInfo[]> {
        const tokens = await this.tokenRepository.getAll();
        return this.mapTokenModelsToTokenInfos(tokens);
    }

    /**
     * Get tokens for a specific network
     */
    async getTokensByNetwork(network: BlockchainNetwork): Promise<TokenInfo[]> {
        const tokens = await this.tokenRepository.getByNetwork(network);
        return this.mapTokenModelsToTokenInfos(tokens);
    }

    /**
     * Get a token by contract address and network
     */
    async getTokenByAddressAndNetwork(
        contractAddress: string,
        network: BlockchainNetwork
    ): Promise<TokenInfo | undefined> {
        const token = await this.tokenRepository.getByAddressAndNetwork(contractAddress, network);
        return token ? this.mapTokenModelToTokenInfo(token) : undefined;
    }

    /**
     * Add a new token
     */
    async addToken(token: TokenInfo): Promise<TokenInfo> {
        // Check if token already exists
        const existingToken = await this.tokenRepository.getByAddressAndNetwork(token.contractAddress, token.network);
        if (existingToken) {
            throw new Error(`Token with contract address ${token.contractAddress} on ${token.network} already exists`);
        }

        const newToken = await this.tokenRepository.create(token);
        return this.mapTokenModelToTokenInfo(newToken);
    }

    /**
     * Update an existing token
     */
    async updateToken(id: string, token: Partial<TokenInfo>): Promise<TokenInfo> {
        const updatedToken = await this.tokenRepository.update(id, token);
        return this.mapTokenModelToTokenInfo(updatedToken);
    }

    /**
     * Delete a token
     */
    async deleteToken(id: string): Promise<boolean> {
        return this.tokenRepository.delete(id);
    }

    /**
     * Map a token model to a token info
     */
    private mapTokenModelToTokenInfo(token: TokenModel): TokenInfo {
        return {
            contractAddress: token.contractAddress,
            network: token.network,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals
        };
    }

    /**
     * Map token models to token infos
     */
    private mapTokenModelsToTokenInfos(tokens: TokenModel[]): TokenInfo[] {
        return tokens.map((token) => this.mapTokenModelToTokenInfo(token));
    }
}
