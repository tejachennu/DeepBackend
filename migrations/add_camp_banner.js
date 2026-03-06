const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || '72.60.202.106',
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'App@1234',
    database: process.env.DB_NAME || 'deep'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to DB');
        await connection.query("ALTER TABLE camps ADD COLUMN BannerUrl VARCHAR(500) AFTER Longitude;");
        console.log('BannerUrl added to camps table');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Column already exists');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
