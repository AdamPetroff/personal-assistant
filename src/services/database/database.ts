import { Kysely, PostgresDialect } from "kysely";
import { DB } from "./db";
import { pool } from "./db-pool";

const dialect = new PostgresDialect({
    pool
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
    dialect
});
