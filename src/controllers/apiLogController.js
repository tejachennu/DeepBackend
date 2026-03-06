const ApiLog = require('../models/ApiLog');

// Get all logs with filters
const getLogs = async (req, res) => {
    try {
        const filters = {
            userId: req.query.userId,
            method: req.query.method,
            statusCode: req.query.statusCode ? parseInt(req.query.statusCode) : null,
            endpoint: req.query.endpoint,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            hasError: req.query.hasError === 'true',
            limit: req.query.limit,
            offset: req.query.offset
        };

        const logs = await ApiLog.findAll(filters);

        res.json({
            success: true,
            data: logs,
            pagination: {
                limit: parseInt(filters.limit) || 50,
                offset: parseInt(filters.offset) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch logs'
        });
    }
};

// Get single log by ID
const getLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await ApiLog.findById(id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log not found'
            });
        }

        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        console.error('Error fetching log:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch log'
        });
    }
};

// Get statistics
const getStats = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const [stats, endpointStats] = await Promise.all([
            ApiLog.getStats(filters),
            ApiLog.getEndpointStats(filters)
        ]);

        res.json({
            success: true,
            data: {
                overview: stats,
                topEndpoints: endpointStats
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

// Cleanup old logs
const cleanupLogs = async (req, res) => {
    try {
        const daysToKeep = parseInt(req.query.days) || 30;
        const deletedCount = await ApiLog.cleanup(daysToKeep);

        res.json({
            success: true,
            message: `Deleted ${deletedCount} logs older than ${daysToKeep} days`
        });
    } catch (error) {
        console.error('Error cleaning up logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup logs'
        });
    }
};

module.exports = {
    getLogs,
    getLogById,
    getStats,
    cleanupLogs
};
