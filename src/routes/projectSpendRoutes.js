const express = require('express');
const projectSpendController = require('../controllers/projectSpendController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireOrgAccess } = require('../middleware/rbac');
const { body, param, query } = require('express-validator');
const { billUpload, azureUploadSingle } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const spendValidation = [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('expenseName').notEmpty().withMessage('Expense name is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('paymentMode').optional().isIn(['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other']).withMessage('Invalid payment mode'),
    body('billDate').optional().isDate().withMessage('Invalid bill date'),
    body('spentDate').optional().isDate().withMessage('Invalid spent date')
];

/**
 * @swagger
 * /api/project-spends:
 *   post:
 *     summary: Record a new expense
 *     tags: [Project Spends]
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
 *               - expenseName
 *               - amount
 *             properties:
 *               projectId:
 *                 type: integer
 *               expenseName:
 *                 type: string
 *               expenseDescription:
 *                 type: string
 *               amount:
 *                 type: number
 *               paidWithTrustAmount:
 *                 type: boolean
 *               paymentMode:
 *                 type: string
 *                 enum: [Cash, Bank Transfer, UPI, Cheque, Card, Other]
 *               paidTo:
 *                 type: string
 *               billDate:
 *                 type: string
 *                 format: date
 *               spentDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Expense recorded successfully
 */
router.post('/', authenticate, spendValidation, projectSpendController.createSpend);

/**
 * @swagger
 * /api/project-spends:
 *   get:
 *     summary: Get all expenses
 *     tags: [Project Spends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
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
 *         description: List of expenses
 */
router.get('/', authenticate, projectSpendController.getAllSpends);

/**
 * @swagger
 * /api/project-spends/unsettled:
 *   get:
 *     summary: Get all unsettled expenses (own money pending reimbursement)
 *     tags: [Project Spends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of unsettled expenses
 */
router.get('/unsettled', authenticate, projectSpendController.getUnsettledSpends);

/**
 * @swagger
 * /api/project-spends/project/{projectId}:
 *   get:
 *     summary: Get all expenses for a project with summary
 *     tags: [Project Spends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *       - in: query
 *         name: paymentMode
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of expenses with summary
 */
router.get('/project/:projectId', authenticate, param('projectId').isInt(), projectSpendController.getSpendsByProject);

/**
 * @swagger
 * /api/project-spends/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Project Spends]
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
 *         description: Expense details
 *       404:
 *         description: Expense not found
 */
router.get('/:id', authenticate, param('id').isInt(), projectSpendController.getSpendById);

/**
 * @swagger
 * /api/project-spends/{id}:
 *   put:
 *     summary: Update an expense
 *     tags: [Project Spends]
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
 *               expenseName:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense updated successfully
 */
router.put('/:id', authenticate, param('id').isInt(), projectSpendController.updateSpend);

/**
 * @swagger
 * /api/project-spends/{id}/approve:
 *   post:
 *     summary: Approve an expense
 *     tags: [Project Spends]
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
 *         description: Expense approved successfully
 */
router.post('/:id/approve', authenticate, requireAdmin, param('id').isInt(), projectSpendController.approveSpend);

/**
 * @swagger
 * /api/project-spends/{id}/reject:
 *   post:
 *     summary: Reject an expense
 *     tags: [Project Spends]
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
 *         description: Expense rejected
 */
router.post('/:id/reject', authenticate, requireAdmin, param('id').isInt(), projectSpendController.rejectSpend);

/**
 * @swagger
 * /api/project-spends/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Project Spends]
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
 *         description: Expense deleted successfully
 */
router.delete('/:id', authenticate, param('id').isInt(), projectSpendController.deleteSpend);

/**
 * @swagger
 * /api/project-spends/{id}/bill:
 *   post:
 *     summary: Upload bill image
 *     tags: [Project Spends]
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
 *               bill:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Bill image uploaded successfully
 */
router.post('/:id/bill', authenticate, param('id').isInt(), billUpload.single('bill'), azureUploadSingle('bills'), projectSpendController.uploadBillImage);

/**
 * @swagger
 * /api/project-spends/{id}/settle:
 *   post:
 *     summary: Settle an expense (mark as reimbursed)
 *     tags: [Project Spends]
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
 *               settlementNotes:
 *                 type: string
 *               settlementAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Expense settled successfully
 */
router.post('/:id/settle', authenticate, param('id').isInt(), projectSpendController.settleSpend);

module.exports = router;
