import { promises as fs } from "fs";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { generateTypes } from "kysely-codegen/dist/esm/generate-types";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("DATABASE_URL environment variable is not set");
        process.exit(1);
    }

    try {
        // Create a PostgreSQL connection pool
        const pool = new Pool({
            connectionString: databaseUrl
        });

        // Create a Kysely dialect
        const dialect = new PostgresDialect({ pool });

        // Generate types from the database
        const types = await generateTypes({
            dialect,
            // Customize the output as needed
            camelCase: true, // Convert snake_case to camelCase
            // Schema is optional, defaults to 'public'
            schema: "public"
        });

        // Write the generated types to a file
        await fs.writeFile("src/services/database/generated-schema.ts", types);
        console.log("Database types generated successfully!");

        // Close the pool
        await pool.end();
    } catch (error) {
        console.error("Error generating database types:", error);
        process.exit(1);
    }
}

main();
