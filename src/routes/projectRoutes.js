const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireOrgAccess } = require('../middleware/rbac');
const { body, param, query } = require('express-validator');
const { bannerUpload, azureUploadSingle } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const projectValidation = [
    body('projectName').notEmpty().withMessage('Project name is required'),
    body('startDate').optional().isDate().withMessage('Invalid start date'),
    body('endDate').optional().isDate().withMessage('Invalid end date'),
    body('status').optional().isIn(['Planned', 'Ongoing', 'Completed']).withMessage('Invalid status')
];

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *             properties:
 *               projectName:
 *                 type: string
 *               projectTitle:
 *                 type: string
 *               projectDescription:
 *                 type: string
 *               objective:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 format: date
 *               endTime:
 *                 type: string
 *               location:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Planned, Ongoing, Completed]
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/', authenticate, projectValidation, projectController.createProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Planned, Ongoing, Completed]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/', authenticate, projectController.getAllProjects);

/**
 * @swagger
 * /api/projects/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Project statistics
 */
router.get('/stats', authenticate, projectController.getProjectStats);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
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
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:id', authenticate, param('id').isInt(), projectController.getProjectById);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Planned, Ongoing, Completed]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put('/:id', authenticate, param('id').isInt(), projectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
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
 *         description: Project deleted successfully
 */
router.delete('/:id', authenticate, param('id').isInt(), projectController.deleteProject);

/**
 * @swagger
 * /api/projects/{id}/banner:
 *   post:
 *     summary: Upload project banner
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 */
router.post('/:id/banner', authenticate, param('id').isInt(), bannerUpload.single('banner'), azureUploadSingle('banners'), projectController.uploadBanner);

module.exports = router;
