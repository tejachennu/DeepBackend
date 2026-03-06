const express = require('express');
const controller = require('../controllers/campaignRegistrationController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Validation
const fieldValidation = [
    body('campaignId').isInt().withMessage('Campaign ID is required'),
    body('fieldName').notEmpty().withMessage('Field name is required'),
    body('fieldLabel').notEmpty().withMessage('Field label is required')
];

const registerValidation = [
    body('campaignCode').notEmpty().withMessage('Campaign code is required')
];

// ==================== Form Fields (Admin) ====================

/**
 * @swagger
 * /api/campaign-registrations/fields:
 *   post:
 *     summary: Create a registration form field for a campaign
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignId, fieldName, fieldLabel]
 *             properties:
 *               campaignId: { type: integer }
 *               fieldName: { type: string }
 *               fieldLabel: { type: string }
 *               fieldType: { type: string, enum: [TEXT, TEXTAREA, SELECT, CHECKBOX, NUMBER, DATE, FILE] }
 *               options: { type: array, items: { type: string } }
 *               isRequired: { type: boolean }
 *               displayOrder: { type: integer }
 *     responses:
 *       201: { description: Field created }
 */
router.post('/fields', authenticate, requireAdmin, fieldValidation, controller.createField);

/**
 * @swagger
 * /api/campaign-registrations/fields/campaign/{campaignId}:
 *   get:
 *     summary: Get form fields for a campaign (admin)
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: campaignId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: List of fields }
 */
router.get('/fields/campaign/:campaignId', authenticate, param('campaignId').isInt(), controller.getFields);

/**
 * @swagger
 * /api/campaign-registrations/fields/public/{campaignCode}:
 *   get:
 *     summary: Get form fields for registration (public, no auth)
 *     tags: [Campaign Registration]
 *     parameters:
 *       - { in: path, name: campaignCode, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Campaign info and form fields }
 */
router.get('/fields/public/:campaignCode', controller.getFieldsPublic);

/**
 * @swagger
 * /api/campaign-registrations/fields/{id}:
 *   put:
 *     summary: Update a form field
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Field updated }
 */
router.put('/fields/:id', authenticate, requireAdmin, param('id').isInt(), controller.updateField);

/**
 * @swagger
 * /api/campaign-registrations/fields/{id}:
 *   delete:
 *     summary: Delete a form field
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Field deleted }
 */
router.delete('/fields/:id', authenticate, requireAdmin, param('id').isInt(), controller.deleteField);

// ==================== Registration (Public - No Auth) ====================

/**
 * @swagger
 * /api/campaign-registrations/register:
 *   post:
 *     summary: Submit campaign registration (public, no auth required)
 *     tags: [Campaign Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignCode]
 *             properties:
 *               campaignCode:
 *                 type: string
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fieldId: { type: integer }
 *                     value: { type: string }
 *     responses:
 *       201: { description: Registration submitted }
 */
router.post('/register', registerValidation, controller.register);

// ==================== Admin Operations ====================

/**
 * @swagger
 * /api/campaign-registrations:
 *   get:
 *     summary: Get all registrations (admin, paginated)
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: campaignId, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [Active, Cancelled] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: offset, schema: { type: integer, default: 0 } }
 *     responses:
 *       200: { description: Paginated list of registrations }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @swagger
 * /api/campaign-registrations/export/{campaignId}:
 *   get:
 *     summary: Export campaign registrations as Excel
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: campaignId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Excel file download }
 */
router.get('/export/:campaignId', authenticate, requireAdmin, param('campaignId').isInt(), controller.exportExcel);

/**
 * @swagger
 * /api/campaign-registrations/{id}:
 *   get:
 *     summary: Get registration details (admin)
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Registration with responses }
 */
router.get('/:id', authenticate, param('id').isInt(), controller.getById);

/**
 * @swagger
 * /api/campaign-registrations/{id}:
 *   put:
 *     summary: Update a registration (admin)
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Registration updated }
 */
router.put('/:id', authenticate, requireAdmin, param('id').isInt(), controller.update);

/**
 * @swagger
 * /api/campaign-registrations/{id}:
 *   delete:
 *     summary: Delete a registration (admin, soft delete)
 *     tags: [Campaign Registration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Registration deleted }
 */
router.delete('/:id', authenticate, requireAdmin, param('id').isInt(), controller.deleteRegistration);

module.exports = router;
