const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole, requireAdmin, requireOrgManager } = require('../middleware/rbac');
const {
    getAllSponsorships,
    getApprovedSponsorships,
    createSponsorship,
    reviewSponsorship,
    getSponsorshipById
} = require('../controllers/sponsorshipController');

// Public route — approved sponsorships for "Sponsor a Needy Person"
router.get('/approved', authenticate, getApprovedSponsorships);

// All below require authentication
router.use(authenticate);

// GET /api/sponsorships — list (org-scoped)
router.get('/', requireOrgManager, getAllSponsorships);

// GET /api/sponsorships/:id — single detail
router.get('/:id', requireOrgManager, getSponsorshipById);

// POST /api/sponsorships — create request (ORG_ADMIN, ORG_STAFF)
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN', 'ORG_ADMIN', 'ORG_STAFF'), createSponsorship);

// PATCH /api/sponsorships/:id/review — approve/reject (SUPER_ADMIN, ADMIN only)
router.patch('/:id/review', requireAdmin, reviewSponsorship);

module.exports = router;
