import { getMigrator } from './run-migrations';

async function main() {
    const { migrator, db } = getMigrator();

    const { error, results } = await migrator.migrateDown();

    results?.forEach((it) => {
        if (it.status === 'Success') {
            console.log(`migration "${it.migrationName}" was undid successfully`);
        } else if (it.status === 'Error') {
            console.error(`failed to undo migration "${it.migrationName}"`);
        }
    });

    if (error) {
        console.error('failed to migrate down');
        console.error(error);
        process.exit(1);
    }

    await db.destroy();
}

main()
    .then(() => {
        console.log('migrated down successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
