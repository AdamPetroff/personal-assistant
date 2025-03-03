# Database

Currently we are using trello as a database. I want to move to a postgres DB. There should be migrations and typescript types on the schema. I think I should use either supabase or fly.io which is used for running the project. I want to be able to easily look at the DB data in an UI. Analyze this and make a plan.

## Analysis

The current implementation uses Trello as a database for storing various types of data:

1. **Tasks/Todo Items**: Stored as cards in different lists (Todo, Doing, Done)
2. **Reminders**: Stored as cards with due dates
3. **User Interests**: Tracked in a dedicated list

The Trello integration is implemented in `src/services/trello.ts` and provides the following functionality:

- Creating, updating, and deleting cards (representing data records)
- Moving cards between lists (status changes)
- Marking cards as complete/incomplete
- Querying cards with filters
- Integration with OpenAI tools for AI-assisted operations

The application is currently deployed on fly.io, which makes it a convenient option for hosting the PostgreSQL database as well.

## Migration Plan

### 1. Database Setup and Configuration

- **Choose Hosting Solution**:

    - Use fly.io's PostgreSQL offering for seamless integration with the existing deployment
    - Benefits: Co-location with the application, simplified deployment, built-in backups

- **Fly.io PostgreSQL Setup**:

    - Create a PostgreSQL cluster using Fly CLI:
        ```bash
        fly postgres create --name personal-assistant-db --region waw
        ```
    - Attach the PostgreSQL app to the main application:
        ```bash
        fly postgres attach --postgres-app personal-assistant-db --app personal-assistant-oetpiw
        ```
    - This will automatically set the `DATABASE_URL` environment variable in the application
    - Update fly.toml to reference the database configuration

- **Database Schema Design**:

    - Create tables that mirror the current Trello structure:
        - `tasks` (replacing Todo/Doing/Done lists)
        - `reminders` (replacing Reminder cards)
        - `interests` (replacing Interest tracking)
    - Add proper relationships and constraints

- **Environment Configuration**:
    - Add database connection variables to `.env` file for local development
    - Update `src/config/constants.ts` to include database configuration

### 2. Implementation

- **Database Client Setup**:

    - Install and configure Prisma ORM for type-safe database access:
        ```bash
        npm install prisma @prisma/client
        npx prisma init
        ```
    - Define schema in Prisma for all required tables
    - Generate TypeScript types from Prisma schema:
        ```bash
        npx prisma generate
        ```

- **Prisma Schema Example**:

    ```prisma
    // prisma/schema.prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }

    generator client {
      provider = "prisma-client-js"
    }

    model Task {
      id          String    @id @default(uuid())
      title       String
      description String?
      status      TaskStatus
      dueDate     DateTime?
      createdAt   DateTime  @default(now())
      updatedAt   DateTime  @updatedAt
    }

    enum TaskStatus {
      TODO
      DOING
      DONE
    }

    model Reminder {
      id           String   @id @default(uuid())
      title        String
      description  String?
      reminderTime DateTime
      completed    Boolean  @default(false)
      createdAt    DateTime @default(now())
      updatedAt    DateTime @updatedAt
    }

    model Interest {
      id          String   @id @default(uuid())
      topic       String
      description String?
      createdAt   DateTime @default(now())
      updatedAt   DateTime @updatedAt
    }
    ```

- **Migration Strategy**:

    - Create initial migration scripts:
        ```bash
        npx prisma migrate dev --name init
        ```
    - Implement data migration utility to transfer data from Trello to PostgreSQL
    - Run in parallel initially to validate correctness

- **Service Implementation**:
    - Create a new `DatabaseService` class to replace `TrelloService`
    - Implement equivalent methods with Prisma client
    - Update OpenAI tool registrations to use the new service

### 3. UI for Database Management

- **Setup Prisma Studio** for development environment database management:
    ```bash
    npx prisma studio
    ```
- **Use Fly.io PostgreSQL Dashboard** for production database management:
    ```bash
    fly postgres connect -a personal-assistant-db
    ```
- **Add database health monitoring** through fly.io dashboard

### 4. Testing and Deployment

- **Unit Tests**:

    - Write tests for the new database service
    - Ensure all functionality matches the previous Trello implementation

- **Integration Testing**:

    - Test the application with the new database in a staging environment
    - Verify all AI tools work correctly with the new data source

- **Deployment**:
    - Deploy database to fly.io using the commands in step 1
    - Update application configuration
    - Monitor for any issues during the transition

### 5. Cleanup

- **Deprecate Trello Integration**:
    - Once migration is complete and stable, remove Trello code
    - Update documentation to reflect the new database architecture

## Detailed Fly.io PostgreSQL Implementation

### Prerequisites

1. **Fly CLI Installation**:

    ```bash
    # For macOS
    brew install flyctl

    # For other platforms, see: https://fly.io/docs/hands-on/install-flyctl/
    ```

2. **Fly.io Authentication**:
    ```bash
    fly auth login
    ```

### Step 1: Create PostgreSQL Cluster

```bash
# Create a PostgreSQL cluster in the same region as your app
fly postgres create \
  --name personal-assistant-db \
  --region waw \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 10
```

This command:

- Creates a PostgreSQL cluster named "personal-assistant-db"
- Deploys it in the Warsaw region (matching your app's primary region)
- Uses a shared CPU with 1GB RAM
- Sets up a single-node cluster (sufficient for most small applications)
- Allocates a 10GB volume for data storage

### Step 2: Attach Database to Application

```bash
fly postgres attach \
  --postgres-app personal-assistant-db \
  --app personal-assistant-oetpiw
```

This command:

- Creates a connection between your app and the PostgreSQL instance
- Automatically sets the `DATABASE_URL` environment variable in your app
- Configures the necessary network settings

### Step 3: Configure Local Development

1. **Get the connection string**:

    ```bash
    fly postgres connect -a personal-assistant-db
    ```

2. **Create a local .env file**:

    ```
    DATABASE_URL="postgres://postgres:password@localhost:5432/personal_assistant?schema=public"
    ```

3. **Set up a local PostgreSQL instance** or use Fly.io's proxy for local development:
    ```bash
    fly proxy 5432 -a personal-assistant-db
    ```

### Step 4: Update Application Code

1. **Update `src/config/constants.ts`**:

    ```typescript
    // Add to existing imports
    import { PrismaClient } from "@prisma/client";

    // Add to environment validation
    export const env = cleanEnv(process.env, {
        // Existing env vars
        DATABASE_URL: str()
    });

    // Initialize Prisma client
    export const prisma = new PrismaClient();
    ```

2. **Create Database Service**:

    ```typescript
    // src/services/database.ts
    import { prisma } from "../config/constants";
    import { TaskStatus } from "@prisma/client";

    export class DatabaseService {
        // Task methods
        async createTask(title: string, description?: string, dueDate?: Date) {
            return prisma.task.create({
                data: {
                    title,
                    description,
                    dueDate,
                    status: "TODO"
                }
            });
        }

        async getTasks(status?: TaskStatus) {
            return prisma.task.findMany({
                where: status ? { status } : undefined,
                orderBy: { createdAt: "desc" }
            });
        }

        // Add other methods similar to TrelloService...
    }
    ```

### Step 5: Database Migrations and Deployment

1. **Create and apply migrations**:

    ```bash
    npx prisma migrate dev --name init
    ```

2. **Deploy the updated application**:

    ```bash
    fly deploy
    ```

3. **Verify database connection**:
    ```bash
    fly logs -a personal-assistant-oetpiw
    ```

### Step 6: Data Migration from Trello

1. **Create a migration script**:

    ```typescript
    // scripts/migrate-from-trello.ts
    import { TrelloService } from "../src/services/trello";
    import { DatabaseService } from "../src/services/database";

    async function migrateData() {
        const trelloService = new TrelloService({
            /* config */
        });
        const dbService = new DatabaseService();

        // Migrate tasks
        const todoCards = await trelloService.getCardsInList("todoListId");
        for (const card of todoCards) {
            await dbService.createTask(card.name, card.desc, card.due ? new Date(card.due) : undefined);
        }

        // Migrate other data types...

        console.log("Migration completed successfully");
    }

    migrateData().catch(console.error);
    ```

2. **Run the migration script**:
    ```bash
    ts-node scripts/migrate-from-trello.ts
    ```

### Step 7: Database Management and Monitoring

1. **Connect to the database**:

    ```bash
    fly postgres connect -a personal-assistant-db
    ```

2. **Create database backups**:

    ```bash
    fly postgres backup create -a personal-assistant-db
    ```

3. **Monitor database metrics** via the Fly.io dashboard:

    ```bash
    fly dashboard -a personal-assistant-db
    ```

4. **Scale the database** if needed:
    ```bash
    fly scale vm shared-cpu-2x -a personal-assistant-db
    ```

## Resources

- **Required Dependencies**:

    - Prisma ORM: For database access and type generation
    - pg: PostgreSQL client for Node.js
    - Database migration tools (built into Prisma)

- **Fly.io PostgreSQL Documentation**:
    - [Fly.io PostgreSQL Documentation](https://fly.io/docs/postgres/)
    - [Fly.io PostgreSQL Reference](https://fly.io/docs/reference/postgres/)
    - [Fly.io PostgreSQL Metrics](https://fly.io/docs/reference/metrics/#postgres-metrics)
    - [Fly.io PostgreSQL Backups](https://fly.io/docs/postgres/managing/backup-restore/)
