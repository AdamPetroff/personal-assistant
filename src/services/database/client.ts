import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { logger } from "../../utils/logger";
import { env } from "../../config/constants";
import { DB } from "./db";

// Get the database URL from environment variables
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
    logger.error("DATABASE_URL environment variable is not set");
    process.exit(1);
}

// Create a PostgreSQL connection pool
const pool = new Pool({
    connectionString: databaseUrl
});

// Create and export the Kysely database instance
export const db = new Kysely<DB>({
    dialect: new PostgresDialect({
        pool
    }),
    log(event) {
        if (event.level === "query") {
            logger.debug(`Executing query: ${event.query.sql}`);
            logger.debug(`Query parameters: ${JSON.stringify(event.query.parameters)}`);
        }
    }
});

// Handle pool errors
pool.on("error", (err) => {
    logger.error("Unexpected error on idle client", err);
    process.exit(-1);
});

// Function to test the database connection
export async function testConnection(): Promise<boolean> {
    try {
        // Simple query to test the connection
        await db.selectFrom("task").select("id").limit(1).execute();
        logger.info("Database connection successful");
        return true;
    } catch (error) {
        logger.error("Database connection failed", { error });
        return false;
    }
}
