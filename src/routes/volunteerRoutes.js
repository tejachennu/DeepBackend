const express = require('express');
const controller = require('../controllers/volunteerController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body, param } = require('express-validator');

const router = express.Router();

// Validation
const fieldValidation = [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('fieldName').notEmpty().withMessage('Field name is required'),
    body('fieldLabel').notEmpty().withMessage('Field label is required')
];

const applyValidation = [
    body('projectId').isInt().withMessage('Project ID is required')
];

// ==================== Form Fields (Admin) ====================

/**
 * @swagger
 * /api/volunteers/fields:
 *   post:
 *     summary: Create a volunteer form field for a project
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, fieldName, fieldLabel]
 *             properties:
 *               projectId: { type: integer }
 *               fieldName: { type: string }
 *               fieldLabel: { type: string }
 *               fieldType: { type: string, enum: [TEXT, TEXTAREA, SELECT, CHECKBOX, NUMBER, DATE] }
 *               options: { type: array, items: { type: string } }
 *               isRequired: { type: boolean }
 *               displayOrder: { type: integer }
 *     responses:
 *       201: { description: Field created }
 */
router.post('/fields', authenticate, requireAdmin, fieldValidation, controller.createField);

/**
 * @swagger
 * /api/volunteers/fields/project/{projectId}:
 *   get:
 *     summary: Get form fields for a project
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: List of fields }
 */
router.get('/fields/project/:projectId', authenticate, param('projectId').isInt(), controller.getFields);

/**
 * @swagger
 * /api/volunteers/fields/{id}:
 *   put:
 *     summary: Update a form field
 *     tags: [Volunteers]
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
 * /api/volunteers/fields/{id}:
 *   delete:
 *     summary: Delete a form field
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Field deleted }
 */
router.delete('/fields/:id', authenticate, requireAdmin, param('id').isInt(), controller.deleteField);

// ==================== Applications (User) ====================

/**
 * @swagger
 * /api/volunteers/apply:
 *   post:
 *     summary: Submit a volunteer application
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId]
 *             properties:
 *               projectId: { type: integer }
 *               message: { type: string }
 *               skills: { type: string }
 *               availability: { type: string }
 *               previousExperience: { type: string }
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fieldId: { type: integer }
 *                     value: { type: string }
 *     responses:
 *       201: { description: Application submitted }
 */
router.post('/apply', authenticate, applyValidation, controller.applyVolunteer);

/**
 * @swagger
 * /api/volunteers/my:
 *   get:
 *     summary: Get my volunteer applications
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of my applications }
 */
router.get('/my', authenticate, controller.getMyApplications);

// ==================== Applications (Admin) ====================

/**
 * @swagger
 * /api/volunteers/project/{projectId}:
 *   get:
 *     summary: Get all volunteer applications for a project
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [Pending, Accepted, Rejected] } }
 *     responses:
 *       200: { description: List of applications with counts }
 */
router.get('/project/:projectId', authenticate, param('projectId').isInt(), controller.getApplicationsByProject);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   get:
 *     summary: Get volunteer application details
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Application detail with responses }
 */
router.get('/:id', authenticate, param('id').isInt(), controller.getApplicationById);

/**
 * @swagger
 * /api/volunteers/{id}/accept:
 *   post:
 *     summary: Accept a volunteer application
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes: { type: string }
 *     responses:
 *       200: { description: Volunteer accepted }
 */
router.post('/:id/accept', authenticate, requireAdmin, param('id').isInt(), controller.acceptApplication);

/**
 * @swagger
 * /api/volunteers/{id}/reject:
 *   post:
 *     summary: Reject a volunteer application
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes: { type: string }
 *     responses:
 *       200: { description: Volunteer rejected }
 */
router.post('/:id/reject', authenticate, requireAdmin, param('id').isInt(), controller.rejectApplication);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   put:
 *     summary: Update a volunteer application
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Application updated }
 */
router.put('/:id', authenticate, param('id').isInt(), controller.updateApplication);

/**
 * @swagger
 * /api/volunteers/{id}:
 *   delete:
 *     summary: Delete a volunteer application
 *     tags: [Volunteers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Application deleted }
 */
router.delete('/:id', authenticate, param('id').isInt(), controller.deleteApplication);

module.exports = router;
