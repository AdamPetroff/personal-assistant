import { db } from "../database";
import { BlockchainNetwork } from "../../blockchain-types";

// Define a runtime token interface that matches the database shape
export interface TokenModel {
    id: string;
    contractAddress: string;
    network: BlockchainNetwork;
    symbol: string;
    name: string;
    decimals: number;
    createdAt: Date;
    updatedAt: Date;
}

export class TokenRepository {
    /**
     * Creates a new token in the database
     */
    async create(
        token: Pick<TokenModel, "contractAddress" | "network" | "symbol" | "name" | "decimals">
    ): Promise<TokenModel> {
        const result = await db
            .insertInto("token")
            .values({
                contractAddress: token.contractAddress,
                network: token.network,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return result as unknown as TokenModel;
    }

    /**
     * Updates an existing token
     */
    async update(
        id: string,
        token: Partial<Pick<TokenModel, "contractAddress" | "network" | "symbol" | "name" | "decimals">>
    ): Promise<TokenModel> {
        const result = await db
            .updateTable("token")
            .set({
                ...token,
                updatedAt: new Date()
            })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return result as unknown as TokenModel;
    }

    /**
     * Deletes a token by id
     */
    async delete(id: string): Promise<boolean> {
        const result = await db.deleteFrom("token").where("id", "=", id).executeTakeFirst();

        return !!result.numDeletedRows;
    }

    /**
     * Gets a token by id
     */
    async getById(id: string): Promise<TokenModel | undefined> {
        const result = await db.selectFrom("token").selectAll().where("id", "=", id).executeTakeFirst();

        return result as unknown as TokenModel | undefined;
    }

    /**
     * Gets a token by contract address and network
     */
    async getByAddressAndNetwork(contractAddress: string, network: BlockchainNetwork): Promise<TokenModel | undefined> {
        const result = await db
            .selectFrom("token")
            .selectAll()
            .where("contractAddress", "=", contractAddress)
            .where("network", "=", network)
            .executeTakeFirst();

        return result as unknown as TokenModel | undefined;
    }

    /**
     * Gets all tokens
     */
    async getAll(): Promise<TokenModel[]> {
        const results = await db.selectFrom("token").selectAll().execute();

        return results as unknown as TokenModel[];
    }

    /**
     * Gets all tokens for a specific network
     */
    async getByNetwork(network: BlockchainNetwork): Promise<TokenModel[]> {
        const results = await db.selectFrom("token").selectAll().where("network", "=", network).execute();

        return results as unknown as TokenModel[];
    }
}
