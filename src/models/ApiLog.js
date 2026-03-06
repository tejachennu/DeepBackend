const db = require('../config/database');

class ApiLog {
    // Create a new log entry
    static async create(logData) {
        const {
            requestId, method, endpoint, statusCode, responseTime,
            userId, userEmail, ipAddress, userAgent,
            requestBody, responseBody, errorMessage
        } = logData;

        const [result] = await db.pool.execute(
            `INSERT INTO api_logs (
                RequestId, Method, Endpoint, StatusCode, ResponseTime,
                UserId, UserEmail, IpAddress, UserAgent,
                RequestBody, ResponseBody, ErrorMessage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                requestId, method, endpoint, statusCode, responseTime,
                userId || null, userEmail || null, ipAddress, userAgent,
                requestBody ? JSON.stringify(requestBody) : null,
                responseBody ? JSON.stringify(responseBody) : null,
                errorMessage || null
            ]
        );
        return result.insertId;
    }

    // Find all logs with filters and pagination
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                LogId, RequestId, Method, Endpoint, StatusCode, ResponseTime,
                UserId, UserEmail, IpAddress, UserAgent, RequestBody, ResponseBody, ErrorMessage, CreatedAt
            FROM api_logs
            WHERE 1=1
        `;
        const params = [];

        if (filters.userId) {
            query += ' AND UserId = ?';
            params.push(filters.userId);
        }

        if (filters.method) {
            query += ' AND Method = ?';
            params.push(filters.method);
        }

        if (filters.statusCode) {
            query += ' AND StatusCode = ?';
            params.push(filters.statusCode);
        }

        if (filters.endpoint) {
            query += ' AND Endpoint LIKE ?';
            params.push(`%${filters.endpoint}%`);
        }

        if (filters.startDate) {
            query += ' AND CreatedAt >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND CreatedAt <= ?';
            params.push(filters.endDate);
        }

        if (filters.hasError) {
            query += ' AND ErrorMessage IS NOT NULL';
        }

        query += ' ORDER BY CreatedAt DESC';

        // Pagination
        const limit = parseInt(filters.limit) || 50;
        const offset = parseInt(filters.offset) || 0;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.pool.execute(query, params);
        return rows.map(row => {
            const parsed = { ...row };
            try {
                if (row.RequestBody) parsed.RequestBody = JSON.parse(row.RequestBody);
                if (row.ResponseBody) parsed.ResponseBody = JSON.parse(row.ResponseBody);
            } catch (e) { }
            return parsed;
        });
    }

    // Find log by ID with full details
    static async findById(logId) {
        const [rows] = await db.pool.execute(
            `SELECT * FROM api_logs WHERE LogId = ?`,
            [logId]
        );
        if (!rows[0]) return null;

        const log = { ...rows[0] };
        try {
            if (log.RequestBody) log.RequestBody = JSON.parse(log.RequestBody);
            if (log.ResponseBody) log.ResponseBody = JSON.parse(log.ResponseBody);
        } catch (e) {
            console.warn(`Error parsing bodies for log ${log.LogId}:`, e.message);
        }
        return log;
    }

    // Get statistics
    static async getStats(filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as totalRequests,
                AVG(ResponseTime) as avgResponseTime,
                MAX(ResponseTime) as maxResponseTime,
                MIN(ResponseTime) as minResponseTime,
                SUM(CASE WHEN StatusCode >= 200 AND StatusCode < 300 THEN 1 ELSE 0 END) as successCount,
                SUM(CASE WHEN StatusCode >= 400 AND StatusCode < 500 THEN 1 ELSE 0 END) as clientErrorCount,
                SUM(CASE WHEN StatusCode >= 500 THEN 1 ELSE 0 END) as serverErrorCount,
                SUM(CASE WHEN ErrorMessage IS NOT NULL THEN 1 ELSE 0 END) as errorCount
            FROM api_logs
            WHERE 1=1
        `;
        const params = [];

        if (filters.startDate) {
            query += ' AND CreatedAt >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND CreatedAt <= ?';
            params.push(filters.endDate);
        }

        const [rows] = await db.pool.execute(query, params);
        return rows[0];
    }

    // Get endpoint statistics
    static async getEndpointStats(filters = {}) {
        let query = `
            SELECT 
                Endpoint,
                Method,
                COUNT(*) as requestCount,
                AVG(ResponseTime) as avgResponseTime,
                SUM(CASE WHEN StatusCode >= 400 THEN 1 ELSE 0 END) as errorCount
            FROM api_logs
            WHERE 1=1
        `;
        const params = [];

        if (filters.startDate) {
            query += ' AND CreatedAt >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND CreatedAt <= ?';
            params.push(filters.endDate);
        }

        query += ' GROUP BY Endpoint, Method ORDER BY requestCount DESC LIMIT 20';

        const [rows] = await db.pool.execute(query, params);
        return rows;
    }

    // Cleanup old logs
    static async cleanup(daysToKeep = 30) {
        const [result] = await db.pool.execute(
            `DELETE FROM api_logs WHERE CreatedAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [daysToKeep]
        );
        return result.affectedRows;
    }
}

module.exports = ApiLog;
