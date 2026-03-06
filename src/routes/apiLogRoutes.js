const express = require('express');
const router = express.Router();
const apiLogController = require('../controllers/apiLogController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get API logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *         description: Filter by HTTP method
 *       - in: query
 *         name: statusCode
 *         schema:
 *           type: integer
 *         description: Filter by status code
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *         description: Filter by endpoint (partial match)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *       - in: query
 *         name: hasError
 *         schema:
 *           type: boolean
 *         description: Filter only error logs
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of API logs
 */
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), apiLogController.getLogs);

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Get API log statistics
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: API statistics
 */
router.get('/stats', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), apiLogController.getStats);

/**
 * @swagger
 * /api/logs/cleanup:
 *   delete:
 *     summary: Cleanup old logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Keep logs from last N days
 *     responses:
 *       200:
 *         description: Cleanup result
 */
router.delete('/cleanup', authenticate, requireRole('SUPER_ADMIN'), apiLogController.cleanupLogs);

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Get log by ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Log details
 *       404:
 *         description: Log not found
 */
router.get('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), apiLogController.getLogById);

module.exports = router;
