import { Pool } from "pg";
import { env } from "../../config/constants";

require("dotenv").config();

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    ssl: false
});
