const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole, requireOrgManager } = require('../middleware/rbac');
const {
    getAllBeneficiaries,
    getBeneficiaryById,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    addDocument,
    getDocuments
} = require('../controllers/beneficiaryController');

// All routes require authentication
router.use(authenticate);

// GET /api/beneficiaries — list (org-scoped for ORG roles)
router.get('/', requireOrgManager, getAllBeneficiaries);

// GET /api/beneficiaries/:id — detail
router.get('/:id', requireOrgManager, getBeneficiaryById);

// POST /api/beneficiaries — create (ORG_ADMIN, ORG_STAFF, ADMIN, SUPER_ADMIN)
router.post('/', requireOrgManager, createBeneficiary);

// PUT /api/beneficiaries/:id — update
router.put('/:id', requireOrgManager, updateBeneficiary);

// DELETE /api/beneficiaries/:id — soft delete
router.delete('/:id', requireOrgManager, deleteBeneficiary);

// POST /api/beneficiaries/:id/documents — upload document
router.post('/:id/documents', requireOrgManager, addDocument);

// GET /api/beneficiaries/:id/documents — list documents
router.get('/:id/documents', requireOrgManager, getDocuments);

module.exports = router;
