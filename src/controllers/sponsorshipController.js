const { query, queryOne } = require('../config/database');

// Get all sponsorship requests
const getAllSponsorships = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;

        let whereClause = 'WHERE 1=1';
        const params = [];

        // Org-scoped for ORG roles
        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            if (!req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'You are not assigned to any organization.' });
            }
            whereClause += ' AND sr.OrganizationId = ?';
            params.push(req.user.OrganizationId);
        }

        if (status) {
            whereClause += ' AND sr.Status = ?';
            params.push(status);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM sponsorship_requests sr ${whereClause}`, params
        );

        const sponsorships = await query(
            `SELECT sr.*, b.FullName AS BeneficiaryName, b.Category, b.PhotoUrl, b.Gender,
                    o.OrganizationName, o.OrganizationType,
                    u.FullName AS RequestedByName,
                    rv.FullName AS ReviewedByName
             FROM sponsorship_requests sr
             LEFT JOIN beneficiaries b ON sr.BeneficiaryId = b.BeneficiaryId
             LEFT JOIN organizations o ON sr.OrganizationId = o.OrganizationId
             LEFT JOIN users u ON sr.RequestedBy = u.UserId
             LEFT JOIN users rv ON sr.ReviewedBy = rv.UserId
             ${whereClause}
             ORDER BY sr.CreatedDate DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                sponsorships,
                pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
            }
        });
    } catch (error) {
        console.error('Get sponsorships error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sponsorship requests.' });
    }
};

// Get approved sponsorships (public — for "Sponsor a Needy Person" tab)
const getApprovedSponsorships = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const category = req.query.category;

        let whereClause = 'WHERE sr.Status = ?';
        const params = ['Approved'];

        if (category) {
            whereClause += ' AND b.Category = ?';
            params.push(category);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM sponsorship_requests sr
             LEFT JOIN beneficiaries b ON sr.BeneficiaryId = b.BeneficiaryId
             ${whereClause}`, params
        );

        const sponsorships = await query(
            `SELECT sr.RequestId, sr.ExpectedAmount, sr.AmountFrequency, sr.Purpose, sr.Status, sr.CreatedDate,
                    b.BeneficiaryId, b.FullName AS BeneficiaryName, b.Category, b.Gender, b.PhotoUrl, b.Description, b.City, b.State,
                    o.OrganizationName, o.OrganizationType
             FROM sponsorship_requests sr
             LEFT JOIN beneficiaries b ON sr.BeneficiaryId = b.BeneficiaryId
             LEFT JOIN organizations o ON sr.OrganizationId = o.OrganizationId
             ${whereClause}
             ORDER BY sr.CreatedDate DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                sponsorships,
                pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
            }
        });
    } catch (error) {
        console.error('Get approved sponsorships error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch approved sponsorships.' });
    }
};

// Create sponsorship request
const createSponsorship = async (req, res) => {
    try {
        const { beneficiaryId, expectedAmount, amountFrequency, purpose } = req.body;

        // Verify beneficiary exists
        const beneficiary = await queryOne(
            'SELECT * FROM beneficiaries WHERE BeneficiaryId = ? AND IsDeleted = FALSE',
            [beneficiaryId]
        );

        if (!beneficiary) {
            return res.status(404).json({ success: false, message: 'Beneficiary not found.' });
        }

        // Org-scoped check
        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            if (beneficiary.OrganizationId !== req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        // Check if there's already a pending or approved request
        const existingRequest = await queryOne(
            `SELECT * FROM sponsorship_requests WHERE BeneficiaryId = ? AND Status IN ('Pending', 'Approved')`,
            [beneficiaryId]
        );

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: `This beneficiary already has a ${existingRequest.Status.toLowerCase()} sponsorship request.`
            });
        }

        const result = await query(
            `INSERT INTO sponsorship_requests (BeneficiaryId, OrganizationId, RequestedBy, ExpectedAmount, AmountFrequency, Purpose, Status, CreatedDate)
             VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
            [beneficiaryId, beneficiary.OrganizationId, req.user.UserId,
                expectedAmount || 50000, amountFrequency || 'Yearly', purpose || null]
        );

        res.status(201).json({
            success: true,
            message: 'Sponsorship request created successfully. Awaiting admin approval.',
            data: { requestId: result.insertId }
        });
    } catch (error) {
        console.error('Create sponsorship error:', error);
        res.status(500).json({ success: false, message: 'Failed to create sponsorship request.' });
    }
};

// Review sponsorship request (SUPER_ADMIN or ADMIN only)
const reviewSponsorship = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
        }

        const request = await queryOne(
            'SELECT * FROM sponsorship_requests WHERE RequestId = ?', [id]
        );

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        if (request.Status !== 'Pending') {
            return res.status(400).json({ success: false, message: `Request is already ${request.Status.toLowerCase()}.` });
        }

        await query(
            `UPDATE sponsorship_requests SET
                Status = ?, ReviewedBy = ?, ReviewedDate = NOW(), ReviewNotes = ?
             WHERE RequestId = ?`,
            [status, req.user.UserId, reviewNotes || null, id]
        );

        res.json({
            success: true,
            message: `Sponsorship request ${status.toLowerCase()} successfully.`
        });
    } catch (error) {
        console.error('Review sponsorship error:', error);
        res.status(500).json({ success: false, message: 'Failed to review sponsorship request.' });
    }
};

// Get single sponsorship request
const getSponsorshipById = async (req, res) => {
    try {
        const { id } = req.params;

        const sponsorship = await queryOne(
            `SELECT sr.*, b.FullName AS BeneficiaryName, b.Category, b.PhotoUrl, b.Gender, b.Description AS BeneficiaryDescription,
                    b.DateOfBirth, b.Address, b.City, b.State,
                    o.OrganizationName, o.OrganizationType,
                    u.FullName AS RequestedByName,
                    rv.FullName AS ReviewedByName
             FROM sponsorship_requests sr
             LEFT JOIN beneficiaries b ON sr.BeneficiaryId = b.BeneficiaryId
             LEFT JOIN organizations o ON sr.OrganizationId = o.OrganizationId
             LEFT JOIN users u ON sr.RequestedBy = u.UserId
             LEFT JOIN users rv ON sr.ReviewedBy = rv.UserId
             WHERE sr.RequestId = ?`,
            [id]
        );

        if (!sponsorship) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        res.json({ success: true, data: sponsorship });
    } catch (error) {
        console.error('Get sponsorship error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sponsorship request.' });
    }
};

module.exports = {
    getAllSponsorships,
    getApprovedSponsorships,
    createSponsorship,
    reviewSponsorship,
    getSponsorshipById
};
