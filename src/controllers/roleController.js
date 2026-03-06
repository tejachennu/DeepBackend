const { query, queryOne } = require('../config/database');

// Get all roles
const getAllRoles = async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';

        let whereClause = 'WHERE IsDeleted = FALSE';
        if (!includeInactive) {
            whereClause += ' AND IsActive = TRUE';
        }

        const roles = await query(
            `SELECT RoleId, RoleName, RoleCode, Description, IsActive, CreatedDate 
             FROM roles ${whereClause} ORDER BY RoleName`
        );

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('Get all roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles.'
        });
    }
};

// Get single role
const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await queryOne(
            'SELECT * FROM roles WHERE RoleId = ? AND IsDeleted = FALSE',
            [id]
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        // Get count of users with this role
        const userCount = await queryOne(
            'SELECT COUNT(*) as count FROM users WHERE RoleId = ?',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...role,
                userCount: userCount.count
            }
        });
    } catch (error) {
        console.error('Get role by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role.'
        });
    }
};

// Create new role
const createRole = async (req, res) => {
    try {
        const { roleName, roleCode, description } = req.body;

        // Check if role code already exists
        const existingRole = await queryOne(
            'SELECT * FROM roles WHERE RoleCode = ?',
            [roleCode]
        );

        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role code already exists.'
            });
        }

        const result = await query(
            `INSERT INTO roles (RoleName, RoleCode, Description, IsActive, CreatedBy, CreatedDate) 
             VALUES (?, ?, ?, TRUE, ?, NOW())`,
            [roleName, roleCode, description || null, req.user.UserId]
        );

        res.status(201).json({
            success: true,
            message: 'Role created successfully.',
            data: { roleId: result.insertId }
        });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create role.'
        });
    }
};

// Update role
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleName, description, isActive } = req.body;

        const role = await queryOne(
            'SELECT * FROM roles WHERE RoleId = ? AND IsDeleted = FALSE',
            [id]
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        // Prevent modification of system roles code
        const systemRoles = ['SUPER_ADMIN', 'ADMIN', 'ORG_ADMIN', 'ORG_STAFF', 'STAFF', 'VOLUNTEER', 'SPONSOR'];
        if (systemRoles.includes(role.RoleCode) && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'System roles cannot be deactivated.'
            });
        }

        await query(
            `UPDATE roles SET 
                RoleName = COALESCE(?, RoleName),
                Description = COALESCE(?, Description),
                IsActive = COALESCE(?, IsActive),
                UpdatedBy = ?,
                UpdatedDate = NOW()
             WHERE RoleId = ?`,
            [roleName, description, isActive, req.user.UserId, id]
        );

        res.json({
            success: true,
            message: 'Role updated successfully.'
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role.'
        });
    }
};

// Delete role (soft delete)
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await queryOne(
            'SELECT * FROM roles WHERE RoleId = ? AND IsDeleted = FALSE',
            [id]
        );

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }

        // Prevent deletion of system roles
        const systemRoles = ['SUPER_ADMIN', 'ADMIN', 'ORG_ADMIN', 'ORG_STAFF', 'STAFF', 'VOLUNTEER', 'SPONSOR'];
        if (systemRoles.includes(role.RoleCode)) {
            return res.status(400).json({
                success: false,
                message: 'System roles cannot be deleted.'
            });
        }

        // Check if role is in use
        const userCount = await queryOne(
            'SELECT COUNT(*) as count FROM users WHERE RoleId = ?',
            [id]
        );

        if (userCount.count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete role. It is assigned to ${userCount.count} user(s).`
            });
        }

        await query(
            'UPDATE roles SET IsDeleted = TRUE, UpdatedBy = ?, UpdatedDate = NOW() WHERE RoleId = ?',
            [req.user.UserId, id]
        );

        res.json({
            success: true,
            message: 'Role deleted successfully.'
        });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete role.'
        });
    }
};

module.exports = {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
