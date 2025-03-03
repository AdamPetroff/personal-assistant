import { promises as fs } from "fs";
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from "kysely";
import * as path from "path";
import { pool } from "../src/services/database/db-pool";

require("dotenv").config();

export function getMigrator() {
    const db = new Kysely<any>({
        dialect: new PostgresDialect({
            pool
        })
    });

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            // This needs to be an absolute path.
            migrationFolder: path.join(__dirname, "../src/migrations")
        })
    });

    return { migrator, db };
}

async function migrateToLatest() {
    const { migrator, db } = getMigrator();

    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
        if (it.status === "Success") {
            console.log(`migration "${it.migrationName}" was executed successfully`);
        } else if (it.status === "Error") {
            console.error(`failed to execute migration "${it.migrationName}"`);
        }
    });

    if (error) {
        console.error("failed to migrate");
        console.error(error);
        process.exit(1);
    }

    await db.destroy();
}

migrateToLatest()
    .then(() => {
        console.log("migrated successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
