import { db } from "../database";
import { BlockchainNetwork } from "../../blockchain-types";

// Define a runtime wallet interface that matches the database shape
export interface WalletModel {
    id: string;
    address: string;
    network: BlockchainNetwork;
    label: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class WalletRepository {
    /**
     * Creates a new wallet in the database
     */
    async create(wallet: Pick<WalletModel, "address" | "network" | "label">): Promise<WalletModel> {
        const result = await db
            .insertInto("wallet")
            .values({
                address: wallet.address,
                network: wallet.network,
                label: wallet.label
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return result as unknown as WalletModel;
    }

    /**
     * Updates an existing wallet
     */
    async update(
        id: string,
        wallet: Partial<Pick<WalletModel, "address" | "network" | "label">>
    ): Promise<WalletModel> {
        const result = await db
            .updateTable("wallet")
            .set({
                ...wallet,
                updatedAt: new Date()
            })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return result as unknown as WalletModel;
    }

    /**
     * Deletes a wallet by id
     */
    async delete(id: string): Promise<boolean> {
        const result = await db.deleteFrom("wallet").where("id", "=", id).executeTakeFirst();

        return !!result.numDeletedRows;
    }

    /**
     * Deletes a wallet by address and network
     */
    async deleteByAddressAndNetwork(address: string, network: BlockchainNetwork): Promise<boolean> {
        const result = await db
            .deleteFrom("wallet")
            .where("address", "=", address)
            .where("network", "=", network)
            .executeTakeFirst();

        return !!result.numDeletedRows;
    }

    /**
     * Gets a wallet by id
     */
    async getById(id: string): Promise<WalletModel | undefined> {
        const result = await db.selectFrom("wallet").selectAll().where("id", "=", id).executeTakeFirst();

        return result as unknown as WalletModel | undefined;
    }

    /**
     * Gets a wallet by address and network
     */
    async getByAddressAndNetwork(address: string, network: BlockchainNetwork): Promise<WalletModel | undefined> {
        const result = await db
            .selectFrom("wallet")
            .selectAll()
            .where("address", "=", address)
            .where("network", "=", network)
            .executeTakeFirst();

        return result as unknown as WalletModel | undefined;
    }

    /**
     * Gets all wallets
     */
    async getAll(): Promise<WalletModel[]> {
        const results = await db.selectFrom("wallet").selectAll().execute();

        return results as unknown as WalletModel[];
    }
}
