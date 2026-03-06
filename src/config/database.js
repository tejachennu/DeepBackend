const mysql = require('mysql2/promise');
const config = require('./index');

// Create connection pool with reconnection handling
const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: config.db.waitForConnections,
    connectionLimit: config.db.connectionLimit,
    queueLimit: config.db.queueLimit,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 60000,
    multipleStatements: false
});


// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Execute query helper - uses pool.query for better type coercion
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Get single row
const queryOne = async (sql, params = []) => {
    const results = await query(sql, params);
    return results[0] || null;
};

// Transaction helper
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Execute function for direct pool access (for models using db.execute pattern)
// Uses pool.query() which handles type coercion better than prepared statements
const execute = async (sql, params = []) => {
    return pool.query(sql, params);
};

module.exports = {
    pool,
    query,
    queryOne,
    transaction,
    testConnection,
    execute
};
