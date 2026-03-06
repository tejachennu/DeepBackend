const express = require('express');
const donationController = require('../controllers/donationController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body, param } = require('express-validator');

const router = express.Router();
console.log('--- [DonationRoutes] INITIALIZING ---');

// Test route
router.get('/ping-test', (req, res) => res.json({ alive: true }));

// Public route for donation certificates - MUST stay above /:id to avoid shadowing
router.get('/public/:id', (req, res, next) => {
    console.log('[DonationRoutes] HIT /public/:id with ID:', req.params.id);
    next();
}, donationController.getDonationById);

// Validation middleware
const razorpayOrderValidation = [
    body('campaignId').isInt().withMessage('Campaign ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('donorName').notEmpty().withMessage('Donor name is required'),
    body('emailId').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
    body('phoneNumber').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number')
];

const offlineDonationValidation = [
    body('campaignId').isInt().withMessage('Campaign ID is required'),
    body('donorName').notEmpty().withMessage('Donor name is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('donationType').isIn(['CASH', 'BANK', 'UPI', 'CHEQUE', 'IN_KIND']).withMessage('Invalid donation type')
];

/**
 * @swagger
 * /api/donations/razorpay/create-order:
 *   post:
 *     summary: Create Razorpay order for online donation
 *     tags: [Donations - Online]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - amount
 *               - donorName
 *             properties:
 *               campaignId:
 *                 type: integer
 *               amount:
 *                 type: number
 *                 minimum: 1
 *               donorName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               emailId:
 *                 type: string
 *               panNumber:
 *                 type: string
 *                 description: Required for 80G certificate
 *               purpose:
 *                 type: string
 *     responses:
 *       200:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     donationId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     keyId:
 *                       type: string
 */
router.post('/razorpay/create-order', razorpayOrderValidation, donationController.createRazorpayOrder);

/**
 * @swagger
 * /api/donations/razorpay/verify:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Donations - Online]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.post('/razorpay/verify', donationController.verifyRazorpayPayment);

// ==================== Offline Donations (Admin Only) ====================

/**
 * @swagger
 * /api/donations/offline:
 *   post:
 *     summary: Record offline donation (Cash, Cheque, Bank Transfer, etc.)
 *     tags: [Donations - Offline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - donorName
 *               - amount
 *               - donationType
 *             properties:
 *               campaignId:
 *                 type: integer
 *               donorType:
 *                 type: string
 *                 enum: [INDIVIDUAL, ORGANIZATION]
 *               donorName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               emailId:
 *                 type: string
 *               panNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               donationType:
 *                 type: string
 *                 enum: [CASH, BANK, UPI, CHEQUE, IN_KIND]
 *               amount:
 *                 type: number
 *               chequeNumber:
 *                 type: string
 *               chequeDate:
 *                 type: string
 *                 format: date
 *               bankName:
 *                 type: string
 *               branchName:
 *                 type: string
 *               transactionReference:
 *                 type: string
 *               donationDate:
 *                 type: string
 *                 format: date-time
 *               purpose:
 *                 type: string
 *               is80GApplicable:
 *                 type: boolean
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Offline donation recorded
 */
router.post('/offline', authenticate, requireAdmin, offlineDonationValidation, donationController.createOfflineDonation);

// ==================== General Donation Operations ====================

/**
 * @swagger
 * /api/donations:
 *   get:
 *     summary: Get all donations
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: donationType
 *         schema:
 *           type: string
 *           enum: [CASH, BANK, UPI, CHEQUE, IN_KIND, RAZORPAY]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Failed, Refunded]
 *       - in: query
 *         name: isOffline
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
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
 *         description: List of donations
 */
router.get('/', authenticate, donationController.getAllDonations);

/**
 * @swagger
 * /api/donations/campaign/{campaignId}:
 *   get:
 *     summary: Get donations by campaign with summary
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Donations with summary
 */
router.get('/campaign/:campaignId', authenticate, param('campaignId').isInt(), donationController.getDonationsByCampaign);

/**
 * @swagger
 * /api/donations/campaign/{campaignId}/recent:
 *   get:
 *     summary: Get recent donations for campaign (public, anonymized)
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent donations (anonymized)
 */
router.get('/campaign/:campaignId/recent', param('campaignId').isInt(), donationController.getRecentDonations);

/**
 * @swagger
 * /api/donations/campaign/{campaignId}/top:
 *   get:
 *     summary: Get top donations for campaign (public, anonymized)
 *     tags: [Donations]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Top donations (anonymized)
 */
router.get('/campaign/:campaignId/top', param('campaignId').isInt(), donationController.getTopDonations);

/**
 * @swagger
 * /api/donations/campaign/{campaignId}/summary:
 *   get:
 *     summary: Get donation summary for campaign
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Donation summary
 */
router.get('/campaign/:campaignId/summary', authenticate, param('campaignId').isInt(), donationController.getDonationSummary);

/**
 * @swagger
 * /api/donations/{id}:
 *   get:
 *     summary: Get donation by ID
 *     tags: [Donations]
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
 *         description: Donation details
 */
router.get('/:id', authenticate, param('id').isInt(), donationController.getDonationById);

/**
 * @swagger
 * /api/donations/{id}:
 *   put:
 *     summary: Update donation (Admin only)
 *     tags: [Donations]
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
 *         description: Donation updated
 */
router.put('/:id', authenticate, requireAdmin, param('id').isInt(), donationController.updateDonation);

/**
 * @swagger
 * /api/donations/{id}:
 *   delete:
 *     summary: Delete donation (Admin only)
 *     tags: [Donations]
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
 *         description: Donation deleted
 */
router.delete('/:id', authenticate, requireAdmin, param('id').isInt(), donationController.deleteDonation);

module.exports = router;
