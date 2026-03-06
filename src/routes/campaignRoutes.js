const express = require('express');
const campaignController = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body, param } = require('express-validator');

const router = express.Router();

// Validation middleware
const campaignValidation = [
    body('projectId').optional({ nullable: true }).isInt().withMessage('Project ID must be an integer'),
    body('campaignName').notEmpty().withMessage('Campaign name is required'),
    body('campaignType').optional().isIn(['FUNDRAISING', 'AWARENESS', 'EVENT']).withMessage('Invalid campaign type'),
    body('targetAmount').optional().isFloat({ min: 0 }).withMessage('Target amount must be positive')
];

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - campaignName
 *             properties:
 *               projectId:
 *                 type: integer
 *               campaignName:
 *                 type: string
 *               campaignCode:
 *                 type: string
 *               campaignType:
 *                 type: string
 *                 enum: [FUNDRAISING, AWARENESS, EVENT]
 *               description:
 *                 type: string
 *               targetAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               videoUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               razorpayEnabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Campaign created successfully
 */
router.post('/', authenticate, campaignValidation, campaignController.createCampaign);

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: campaignType
 *         schema:
 *           type: string
 *           enum: [FUNDRAISING, AWARENESS, EVENT]
 *       - in: query
 *         name: campaignStatus
 *         schema:
 *           type: string
 *           enum: [Draft, Active, Paused, Completed, Cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get('/', authenticate, campaignController.getAllCampaigns);

/**
 * @swagger
 * /api/campaigns/public:
 *   get:
 *     summary: Get public active campaigns (no auth required)
 *     tags: [Campaigns]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of public campaigns
 */
router.get('/public', campaignController.getPublicCampaigns);

/**
 * @swagger
 * /api/campaigns/public/{id}:
 *   get:
 *     summary: Get public campaign by ID (no auth required)
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Campaign details
 *       404:
 *         description: Campaign not found
 */
router.get('/public/:id', param('id').isInt(), campaignController.getCampaignByIdPublic);

/**
 * @swagger
 * /api/campaigns/code/{code}:
 *   get:
 *     summary: Get campaign by code (for donation page, no auth)
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign details for donation page
 */
router.get('/code/:code', campaignController.getCampaignByCode);
router.get('/code/:code/auth', authenticate, campaignController.getCampaignByCodeAuth);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID with statistics
 *     tags: [Campaigns]
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
 *         description: Campaign with statistics
 */
router.get('/:id', authenticate, param('id').isInt(), campaignController.getCampaignById);

/**
 * @swagger
 * /api/campaigns/{id}/stats:
 *   get:
 *     summary: Get campaign statistics
 *     tags: [Campaigns]
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
 *         description: Campaign statistics
 */
router.get('/:id/stats', authenticate, param('id').isInt(), campaignController.getCampaignStats);

/**
 * @swagger
 * /api/campaigns/{id}/analytics:
 *   get:
 *     summary: Get campaign analytics (daily trends, payment breakdown, top donors)
 *     tags: [Campaigns]
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
 *         description: Campaign analytics data
 */
router.get('/:id/analytics', authenticate, param('id').isInt(), campaignController.getCampaignAnalytics);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     tags: [Campaigns]
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
 *               campaignName:
 *                 type: string
 *               campaignStatus:
 *                 type: string
 *                 enum: [Draft, Active, Paused, Completed, Cancelled]
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Campaign updated
 */
router.put('/:id', authenticate, param('id').isInt(), campaignController.updateCampaign);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     tags: [Campaigns]
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
 *         description: Campaign deleted
 */
router.delete('/:id', authenticate, requireAdmin, param('id').isInt(), campaignController.deleteCampaign);

module.exports = router;
