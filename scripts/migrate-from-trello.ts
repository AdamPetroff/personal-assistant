import { initTrelloService } from "../src/services/trello";
import { databaseService } from "../src/services/database";
import { logger } from "../src/utils/logger";

// List IDs from Trello
const todoListId = "675a0dd51091fad3e2ebdcf1";
const doingListId = "675a0dd555a79cada51dd102";
const doneListId = "675a0dd571d291845551064d";
const remindersListId = "6781aeadda90c1ca4fb7e2ab";
const interestsListId = "6781af478a024f11a93b752d";

async function migrateData() {
    try {
        logger.info("Starting data migration from Trello to PostgreSQL...");

        const trelloService = initTrelloService();

        // Migrate tasks from Todo list
        logger.info("Migrating tasks from Todo list...");
        const todoCards = await trelloService.getCardsInList(todoListId);
        for (const card of todoCards) {
            await databaseService.createTask(card.name, card.desc, card.due ? new Date(card.due) : undefined);
            logger.info(`Migrated Todo task: ${card.name}`);
        }

        // Migrate tasks from Doing list
        logger.info("Migrating tasks from Doing list...");
        const doingCards = await trelloService.getCardsInList(doingListId);
        for (const card of doingCards) {
            const task = await databaseService.createTask(
                card.name,
                card.desc,
                card.due ? new Date(card.due) : undefined
            );
            await databaseService.updateTaskStatus(task.id, "DOING");
            logger.info(`Migrated Doing task: ${card.name}`);
        }

        // Migrate tasks from Done list
        logger.info("Migrating tasks from Done list...");
        const doneCards = await trelloService.getCardsInList(doneListId);
        for (const card of doneCards) {
            const task = await databaseService.createTask(
                card.name,
                card.desc,
                card.due ? new Date(card.due) : undefined
            );
            await databaseService.updateTaskStatus(task.id, "DONE");
            logger.info(`Migrated Done task: ${card.name}`);
        }

        // Migrate reminders
        logger.info("Migrating reminders...");
        const reminderCards = await trelloService.getCardsInList(remindersListId);
        for (const card of reminderCards) {
            if (card.due) {
                await databaseService.createReminder(card.name, new Date(card.due), card.desc);
                logger.info(`Migrated reminder: ${card.name}`);
            } else {
                logger.warn(`Skipped reminder without due date: ${card.name}`);
            }
        }

        // Migrate interests
        logger.info("Migrating interests...");
        const interestCards = await trelloService.getCardsInList(interestsListId);
        for (const card of interestCards) {
            await databaseService.createInterest(card.name, card.desc);
            logger.info(`Migrated interest: ${card.name}`);
        }

        logger.info("Data migration completed successfully!");
    } catch (error) {
        logger.error("Error during data migration:", error);
        process.exit(1);
    }
}

// Run the migration
migrateData();
