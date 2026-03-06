const express = require('express');
const controller = require('../controllers/beneficiaryDonationController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { imageUpload, videoUpload, azureUploadMultiple } = require('../middleware/upload');

const router = express.Router();

const validation = [
    body('projectId').isInt().withMessage('Project ID required'),
    body('title').notEmpty().withMessage('Title required')
];

/**
 * @swagger
 * /api/beneficiary-donations:
 *   post:
 *     summary: Create beneficiary donation
 *     tags: [Beneficiary Donations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, title]
 *             properties:
 *               projectId: { type: integer }
 *               organizationId: { type: integer }
 *               title: { type: string }
 *               description: { type: string }
 *               donationType: { type: string, enum: [CASH, IN_KIND, GOODS, SERVICES, FOOD, CLOTHING, MEDICAL, OTHER] }
 *               amount: { type: number }
 *               currency: { type: string }
 *               receivedItemName: { type: string }
 *               receivedItemDescription: { type: string }
 *               beneficiaryName: { type: string }
 *               beneficiaryContact: { type: string }
 *               beneficiaryAddress: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', authenticate, validation, controller.create);

/**
 * @swagger
 * /api/beneficiary-donations:
 *   get:
 *     summary: Get all beneficiary donations
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: projectId, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [Pending, Distributed, InProgress, Completed, Cancelled] } }
 *       - { in: query, name: donationType, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: List of donations }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @swagger
 * /api/beneficiary-donations/project/{projectId}/summary:
 *   get:
 *     summary: Get summary for project
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: projectId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Summary }
 */
router.get('/project/:projectId/summary', authenticate, param('projectId').isInt(), controller.getSummary);

/**
 * @swagger
 * /api/beneficiary-donations/{id}:
 *   get:
 *     summary: Get by ID with media
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Donation with media }
 */
router.get('/:id', authenticate, param('id').isInt(), controller.getById);

/**
 * @swagger
 * /api/beneficiary-donations/{id}:
 *   put:
 *     summary: Update donation
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Updated }
 */
router.put('/:id', authenticate, param('id').isInt(), controller.update);

/**
 * @swagger
 * /api/beneficiary-donations/{id}:
 *   delete:
 *     summary: Delete donation
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id', authenticate, param('id').isInt(), controller.delete);

// Media endpoints
/**
 * @swagger
 * /api/beneficiary-donations/{id}/images:
 *   post:
 *     summary: Upload images
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: Uploaded }
 */
router.post('/:id/images', authenticate, imageUpload.array('images', 10), azureUploadMultiple('beneficiary'), controller.uploadImages);

/**
 * @swagger
 * /api/beneficiary-donations/{id}/videos:
 *   post:
 *     summary: Upload videos
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       201: { description: Uploaded }
 */
router.post('/:id/videos', authenticate, videoUpload.array('videos', 5), azureUploadMultiple('beneficiary'), controller.uploadVideos);

/**
 * @swagger
 * /api/beneficiary-donations/{id}/media:
 *   get:
 *     summary: Get all media
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Media list }
 */
router.get('/:id/media', authenticate, controller.getMedia);

/**
 * @swagger
 * /api/beneficiary-donations/{id}/media/{mediaId}:
 *   delete:
 *     summary: Delete media
 *     tags: [Beneficiary Donations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:id/media/:mediaId', authenticate, controller.deleteMedia);

module.exports = router;
