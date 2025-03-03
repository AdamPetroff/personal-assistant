import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    // Create TaskStatus enum type
    await sql`CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE')`.execute(db);

    // Create Task table
    await db.schema
        .createTable("task")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("description", "text")
        .addColumn("status", sql`"TaskStatus"`, (col) => col.notNull())
        .addColumn("dueDate", "timestamp(3)")
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull())
        .execute();

    // Create Reminder table
    await db.schema
        .createTable("reminder")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("title", "text", (col) => col.notNull())
        .addColumn("description", "text")
        .addColumn("reminderTime", "timestamp(3)", (col) => col.notNull())
        .addColumn("completed", "boolean", (col) => col.notNull().defaultTo(false))
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull())
        .execute();

    // Create Interest table
    await db.schema
        .createTable("interest")
        .addColumn("id", "uuid", (col) =>
            col
                .primaryKey()
                .notNull()
                .defaultTo(sql`gen_random_uuid()`)
        )
        .addColumn("topic", "text", (col) => col.notNull())
        .addColumn("description", "text")
        .addColumn("createdAt", "timestamp(3)", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn("updatedAt", "timestamp(3)", (col) => col.notNull())
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop tables in reverse order
    await db.schema.dropTable("interest").execute();
    await db.schema.dropTable("reminder").execute();
    await db.schema.dropTable("task").execute();

    // Drop enum type
    await sql`DROP TYPE IF EXISTS "TaskStatus"`.execute(db);
}
