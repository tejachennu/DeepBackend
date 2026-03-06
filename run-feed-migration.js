require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/database');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'feed.sql');
        const sqlParams = fs.readFileSync(sqlPath, 'utf8').split(';');

        for (const query of sqlParams) {
            const statement = query.trim();
            if (statement) {
                console.log('Executing:', statement.substring(0, 50) + '...');
                await db.execute(statement);
            }
        }
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
