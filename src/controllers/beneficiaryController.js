const { query, queryOne } = require('../config/database');

// Get all beneficiaries (org-scoped for ORG_ADMIN/ORG_STAFF)
const getAllBeneficiaries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category;
        const organizationId = req.query.organizationId;

        let whereClause = 'WHERE b.IsDeleted = FALSE';
        const params = [];

        // Org-scoped access for ORG_ADMIN and ORG_STAFF
        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            if (!req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'You are not assigned to any organization.' });
            }
            whereClause += ' AND b.OrganizationId = ?';
            params.push(req.user.OrganizationId);
        } else if (organizationId) {
            whereClause += ' AND b.OrganizationId = ?';
            params.push(organizationId);
        }

        if (search) {
            whereClause += ' AND (b.FullName LIKE ? OR b.Description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category) {
            whereClause += ' AND b.Category = ?';
            params.push(category);
        }

        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM beneficiaries b ${whereClause}`, params
        );

        const beneficiaries = await query(
            `SELECT b.*, o.OrganizationName, o.OrganizationType, u.FullName AS AddedByName,
                    (SELECT COUNT(*) FROM sponsorship_requests sr WHERE sr.BeneficiaryId = b.BeneficiaryId) AS sponsorshipCount,
                    (SELECT sr.Status FROM sponsorship_requests sr WHERE sr.BeneficiaryId = b.BeneficiaryId ORDER BY sr.CreatedDate DESC LIMIT 1) AS latestSponsorshipStatus
             FROM beneficiaries b
             LEFT JOIN organizations o ON b.OrganizationId = o.OrganizationId
             LEFT JOIN users u ON b.AddedBy = u.UserId
             ${whereClause}
             ORDER BY b.CreatedDate DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                beneficiaries,
                pagination: { page, limit, total: countResult.total, totalPages: Math.ceil(countResult.total / limit) }
            }
        });
    } catch (error) {
        console.error('Get beneficiaries error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch beneficiaries.' });
    }
};

// Get single beneficiary
const getBeneficiaryById = async (req, res) => {
    try {
        const { id } = req.params;

        const beneficiary = await queryOne(
            `SELECT b.*, o.OrganizationName, o.OrganizationType, u.FullName AS AddedByName
             FROM beneficiaries b
             LEFT JOIN organizations o ON b.OrganizationId = o.OrganizationId
             LEFT JOIN users u ON b.AddedBy = u.UserId
             WHERE b.BeneficiaryId = ? AND b.IsDeleted = FALSE`,
            [id]
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

        // Get documents
        const documents = await query(
            'SELECT * FROM beneficiary_documents WHERE BeneficiaryId = ? ORDER BY CreatedDate DESC',
            [id]
        );

        // Get sponsorship requests
        const sponsorships = await query(
            `SELECT sr.*, u.FullName AS ReviewedByName
             FROM sponsorship_requests sr
             LEFT JOIN users u ON sr.ReviewedBy = u.UserId
             WHERE sr.BeneficiaryId = ?
             ORDER BY sr.CreatedDate DESC`,
            [id]
        );

        res.json({
            success: true,
            data: { ...beneficiary, documents, sponsorships }
        });
    } catch (error) {
        console.error('Get beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch beneficiary.' });
    }
};

// Create beneficiary
const createBeneficiary = async (req, res) => {
    try {
        const {
            fullName, dateOfBirth, gender, category,
            photoUrl, address, city, state, description
        } = req.body;

        // Determine org ID
        let organizationId = req.body.organizationId;
        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            organizationId = req.user.OrganizationId;
        }

        if (!organizationId) {
            return res.status(400).json({ success: false, message: 'Organization is required.' });
        }

        const result = await query(
            `INSERT INTO beneficiaries (FullName, DateOfBirth, Gender, Category, PhotoUrl, Address, City, State, Description, OrganizationId, AddedBy, CreatedDate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [fullName, dateOfBirth || null, gender || 'Male', category, photoUrl || null,
                address || null, city || null, state || null, description || null,
                organizationId, req.user.UserId]
        );

        res.status(201).json({
            success: true,
            message: 'Beneficiary added successfully.',
            data: { beneficiaryId: result.insertId }
        });
    } catch (error) {
        console.error('Create beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to add beneficiary.' });
    }
};

// Update beneficiary
const updateBeneficiary = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fullName, dateOfBirth, gender, category,
            photoUrl, address, city, state, description, status
        } = req.body;

        const beneficiary = await queryOne(
            'SELECT * FROM beneficiaries WHERE BeneficiaryId = ? AND IsDeleted = FALSE', [id]
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

        await query(
            `UPDATE beneficiaries SET
                FullName = COALESCE(?, FullName),
                DateOfBirth = COALESCE(?, DateOfBirth),
                Gender = COALESCE(?, Gender),
                Category = COALESCE(?, Category),
                PhotoUrl = COALESCE(?, PhotoUrl),
                Address = COALESCE(?, Address),
                City = COALESCE(?, City),
                State = COALESCE(?, State),
                Description = COALESCE(?, Description),
                Status = COALESCE(?, Status)
             WHERE BeneficiaryId = ?`,
            [fullName, dateOfBirth, gender, category, photoUrl, address, city, state, description, status, id]
        );

        res.json({ success: true, message: 'Beneficiary updated successfully.' });
    } catch (error) {
        console.error('Update beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to update beneficiary.' });
    }
};

// Delete beneficiary (soft delete)
const deleteBeneficiary = async (req, res) => {
    try {
        const { id } = req.params;

        const beneficiary = await queryOne(
            'SELECT * FROM beneficiaries WHERE BeneficiaryId = ? AND IsDeleted = FALSE', [id]
        );

        if (!beneficiary) {
            return res.status(404).json({ success: false, message: 'Beneficiary not found.' });
        }

        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            if (beneficiary.OrganizationId !== req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        await query('UPDATE beneficiaries SET IsDeleted = TRUE WHERE BeneficiaryId = ?', [id]);
        res.json({ success: true, message: 'Beneficiary deleted successfully.' });
    } catch (error) {
        console.error('Delete beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete beneficiary.' });
    }
};

// Add document to beneficiary
const addDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentName, documentUrl, documentType } = req.body;

        const beneficiary = await queryOne(
            'SELECT * FROM beneficiaries WHERE BeneficiaryId = ? AND IsDeleted = FALSE', [id]
        );

        if (!beneficiary) {
            return res.status(404).json({ success: false, message: 'Beneficiary not found.' });
        }

        if (['ORG_ADMIN', 'ORG_STAFF'].includes(req.user.RoleCode)) {
            if (beneficiary.OrganizationId !== req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const result = await query(
            `INSERT INTO beneficiary_documents (BeneficiaryId, DocumentName, DocumentUrl, DocumentType, UploadedBy, CreatedDate)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [id, documentName || 'Untitled', documentUrl, documentType || 'Other', req.user.UserId]
        );

        res.status(201).json({
            success: true,
            message: 'Document added successfully.',
            data: { documentId: result.insertId }
        });
    } catch (error) {
        console.error('Add document error:', error);
        res.status(500).json({ success: false, message: 'Failed to add document.' });
    }
};

// Get documents for beneficiary
const getDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const documents = await query(
            'SELECT * FROM beneficiary_documents WHERE BeneficiaryId = ? ORDER BY CreatedDate DESC',
            [id]
        );
        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
    }
};

module.exports = {
    getAllBeneficiaries,
    getBeneficiaryById,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    addDocument,
    getDocuments
};
