const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('../src/config/database');

async function main() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'project_permissions.sql'), 'utf8');
        const commands = sql.split(';').map(c => c.trim()).filter(c => c.length > 0);
        for (let cmd of commands) {
            if (cmd.startsWith('USE')) continue;

            // Removing comments to avoid empty command errors
            const strippedCmd = cmd.replace(/--.*$/gm, '').trim();
            if (!strippedCmd) continue;

            console.log('Executing:', strippedCmd.substring(0, 50) + '...');
            await db.execute(strippedCmd);
        }
        console.log('All migrations applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
