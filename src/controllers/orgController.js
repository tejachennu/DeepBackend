const { query, queryOne } = require('../config/database');

// Get all organizations (with pagination and filters)
const getAllOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const type = req.query.type;
        const city = req.query.city;

        let whereClause = 'WHERE IsDeleted = FALSE';
        const params = [];

        // For Organization Admin, only show their own organization
        if (req.user.RoleCode === 'ORG_ADMIN') {
            if (!req.user.OrganizationId) {
                return res.json({
                    success: true,
                    data: { organizations: [], pagination: { page, limit, total: 0, totalPages: 0 } }
                });
            }
            whereClause += ' AND OrganizationId = ?';
            params.push(req.user.OrganizationId);
        }

        if (search) {
            whereClause += ' AND (OrganizationName LIKE ? OR ContactPersonName LIKE ? OR City LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (type) {
            whereClause += ' AND OrganizationType = ?';
            params.push(type);
        }

        if (city) {
            whereClause += ' AND City = ?';
            params.push(city);
        }

        // Get total count
        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM organizations ${whereClause}`,
            params
        );

        // Get organizations
        const organizations = await query(
            `SELECT OrganizationId, OrganizationName, OrganizationType, RegistrationNumber,
                    ContactPersonName, ContactMobile, ContactEmail, 
                    Address, City, State, Pincode, TotalBeneficiaries,
                    OrgLogo, IsActive, CreatedDate
             FROM organizations 
             ${whereClause}
             ORDER BY CreatedDate DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                organizations,
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organizations.'
        });
    }
};

// Get single organization
const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        // For Org Admin, verify access to this organization
        if (req.user.RoleCode === 'ORG_ADMIN' && req.user.OrganizationId !== parseInt(id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own organization.'
            });
        }

        const organization = await queryOne(
            `SELECT * FROM organizations WHERE OrganizationId = ? AND IsDeleted = FALSE`,
            [id]
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        // Get member count
        const memberCount = await queryOne(
            'SELECT COUNT(*) as count FROM users WHERE OrganizationId = ?',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...organization,
                memberCount: memberCount.count
            }
        });
    } catch (error) {
        console.error('Get organization by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization.'
        });
    }
};

// Create organization
const createOrganization = async (req, res) => {
    try {
        const {
            organizationName, organizationType, registrationNumber,
            contactPersonName, contactMobile, contactEmail,
            address, city, state, pincode, totalBeneficiaries, orgLogo
        } = req.body;

        const result = await query(
            `INSERT INTO organizations (
                OrganizationName, OrganizationType, RegistrationNumber,
                ContactPersonName, ContactMobile, ContactEmail,
                Address, City, State, Pincode, TotalBeneficiaries,
                OrgLogo, IsActive, CreatedBy, CreatedDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())`,
            [
                organizationName, organizationType, registrationNumber || null,
                contactPersonName || null, contactMobile || null, contactEmail || null,
                address || null, city || null, state || null, pincode || null,
                totalBeneficiaries || 0, orgLogo || null, req.user.UserId
            ]
        );

        // If Org Admin creates org and has no org assigned, assign them to this new org
        if (req.user.RoleCode === 'ORG_ADMIN' && !req.user.OrganizationId) {
            await query(
                'UPDATE users SET OrganizationId = ? WHERE UserId = ?',
                [result.insertId, req.user.UserId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Organization created successfully.',
            data: { organizationId: result.insertId }
        });
    } catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create organization.'
        });
    }
};

// Update organization
const updateOrganization = async (req, res) => {
    try {
        const { id } = req.params;

        // For Org Admin, verify access
        if (req.user.RoleCode === 'ORG_ADMIN' && req.user.OrganizationId !== parseInt(id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own organization.'
            });
        }

        const organization = await queryOne(
            'SELECT * FROM organizations WHERE OrganizationId = ? AND IsDeleted = FALSE',
            [id]
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        const {
            organizationName, organizationType, registrationNumber,
            contactPersonName, contactMobile, contactEmail,
            address, city, state, pincode, totalBeneficiaries, isActive, orgLogo
        } = req.body;

        await query(
            `UPDATE organizations SET 
                OrganizationName = COALESCE(?, OrganizationName),
                OrganizationType = COALESCE(?, OrganizationType),
                RegistrationNumber = COALESCE(?, RegistrationNumber),
                ContactPersonName = COALESCE(?, ContactPersonName),
                ContactMobile = COALESCE(?, ContactMobile),
                ContactEmail = COALESCE(?, ContactEmail),
                Address = COALESCE(?, Address),
                City = COALESCE(?, City),
                State = COALESCE(?, State),
                Pincode = COALESCE(?, Pincode),
                TotalBeneficiaries = COALESCE(?, TotalBeneficiaries),
                IsActive = COALESCE(?, IsActive),
                OrgLogo = COALESCE(?, OrgLogo),
                UpdatedBy = ?,
                UpdatedDate = NOW()
             WHERE OrganizationId = ?`,
            [
                organizationName, organizationType, registrationNumber,
                contactPersonName, contactMobile, contactEmail,
                address, city, state, pincode, totalBeneficiaries, isActive,
                orgLogo, req.user.UserId, id
            ]
        );

        res.json({
            success: true,
            message: 'Organization updated successfully.'
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization.'
        });
    }
};

// Delete organization (soft delete)
const deleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;

        const organization = await queryOne(
            'SELECT * FROM organizations WHERE OrganizationId = ? AND IsDeleted = FALSE',
            [id]
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.'
            });
        }

        // Check if organization has members
        const memberCount = await queryOne(
            'SELECT COUNT(*) as count FROM users WHERE OrganizationId = ?',
            [id]
        );

        if (memberCount.count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete organization. It has ${memberCount.count} member(s) assigned.`
            });
        }

        await query(
            'UPDATE organizations SET IsDeleted = TRUE, UpdatedBy = ?, UpdatedDate = NOW() WHERE OrganizationId = ?',
            [req.user.UserId, id]
        );

        res.json({
            success: true,
            message: 'Organization deleted successfully.'
        });
    } catch (error) {
        console.error('Delete organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete organization.'
        });
    }
};

// Get organization members
const getOrganizationMembers = async (req, res) => {
    try {
        const { id } = req.params;

        // For Org Admin, verify access
        if (req.user.RoleCode === 'ORG_ADMIN' && req.user.OrganizationId !== parseInt(id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own organization members.'
            });
        }

        const members = await query(
            `SELECT u.UserId, u.FullName, u.Email, u.MobileNumber, u.Status,
                    r.RoleName, r.RoleCode
             FROM users u
             LEFT JOIN roles r ON u.RoleId = r.RoleId
             WHERE u.OrganizationId = ?
             ORDER BY u.FullName`,
            [id]
        );

        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Get organization members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization members.'
        });
    }
};

// Get organization types
const getOrganizationTypes = async (req, res) => {
    res.json({
        success: true,
        data: ['Orphanage', 'School', 'NGO', 'Shelter Home']
    });
};

module.exports = {
    getAllOrganizations,
    getOrganizationById,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getOrganizationMembers,
    getOrganizationTypes
};
