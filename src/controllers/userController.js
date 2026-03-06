const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../config/database');

// Get all users (with pagination)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status;
        const roleId = req.query.roleId;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ' AND (u.FullName LIKE ? OR u.Email LIKE ? OR u.Username LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status) {
            whereClause += ' AND u.Status = ?';
            params.push(status);
        }

        if (roleId) {
            whereClause += ' AND u.RoleId = ?';
            params.push(roleId);
        }

        // Get total count
        const countResult = await queryOne(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            params
        );

        // Get users
        const users = await query(
            `SELECT u.UserId, u.FullName, u.Email, u.Username, u.MobileNumber, 
                    u.Status, u.IsEmailVerified, u.LastLogin, u.CreatedDate,
                    r.RoleName, r.RoleCode,
                    o.OrganizationName
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             LEFT JOIN organizations o ON u.OrganizationId = o.OrganizationId
             ${whereClause}
             ORDER BY u.CreatedDate DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users.'
        });
    }
};

// Get single user
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await queryOne(
            `SELECT u.UserId, u.FullName, u.Email, u.Username, u.MobileNumber, 
                    u.Status, u.IsEmailVerified, u.LastLogin, u.CreatedDate,
                    u.RoleId, u.OrganizationId,
                    r.RoleName, r.RoleCode,
                    o.OrganizationName, o.OrganizationType
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             LEFT JOIN organizations o ON u.OrganizationId = o.OrganizationId
             WHERE u.UserId = ?`,
            [id]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user.'
        });
    }
};

// Assign role to user
const assignRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;

        // Verify user exists
        const user = await queryOne('SELECT * FROM users WHERE UserId = ?', [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Verify role exists
        const role = await queryOne('SELECT * FROM roles WHERE RoleId = ? AND IsActive = TRUE', [roleId]);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found or inactive.'
            });
        }

        // Update user role
        await query(
            'UPDATE users SET RoleId = ? WHERE UserId = ?',
            [roleId, id]
        );

        res.json({
            success: true,
            message: `Role "${role.RoleName}" assigned to user successfully.`
        });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign role.'
        });
    }
};

// Update user status (Active/Inactive/Blocked)
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Active, Inactive, or Blocked.'
            });
        }

        const user = await queryOne('SELECT * FROM users WHERE UserId = ?', [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        await query(
            'UPDATE users SET Status = ? WHERE UserId = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: `User status updated to ${status}.`
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status.'
        });
    }
};

// Assign user to organization
const assignOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.body;

        // Verify user exists
        const user = await queryOne('SELECT * FROM users WHERE UserId = ?', [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Verify organization exists (if not null)
        if (organizationId) {
            const org = await queryOne(
                'SELECT * FROM organizations WHERE OrganizationId = ? AND IsDeleted = FALSE',
                [organizationId]
            );
            if (!org) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found.'
                });
            }
        }

        await query(
            'UPDATE users SET OrganizationId = ? WHERE UserId = ?',
            [organizationId || null, id]
        );

        res.json({
            success: true,
            message: organizationId
                ? 'User assigned to organization successfully.'
                : 'User removed from organization.'
        });
    } catch (error) {
        console.error('Assign organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign organization.'
        });
    }
};

// Update user profile (self)
const updateProfile = async (req, res) => {
    try {
        const { fullName, mobileNumber, username } = req.body;
        const userId = req.user.UserId;

        // Check username availability
        if (username) {
            const existingUser = await queryOne(
                'SELECT * FROM users WHERE Username = ? AND UserId != ?',
                [username, userId]
            );
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken.'
                });
            }
        }

        await query(
            `UPDATE users SET 
                FullName = COALESCE(?, FullName),
                MobileNumber = COALESCE(?, MobileNumber),
                Username = COALESCE(?, Username)
             WHERE UserId = ?`,
            [fullName, mobileNumber, username, userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully.'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.UserId;

        const user = await queryOne('SELECT Password FROM users WHERE UserId = ?', [userId]);

        if (!user.Password) {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google login. Password cannot be changed here.'
            });
        }

        const isValid = await bcrypt.compare(currentPassword, user.Password);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await query('UPDATE users SET Password = ? WHERE UserId = ?', [hashedPassword, userId]);

        res.json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password.'
        });
    }
};

// Create user (Admin only)
const createUser = async (req, res) => {
    try {
        const { email, password, fullName, username, mobileNumber, roleId, organizationId, status } = req.body;

        // Check if user exists
        const existingUser = await queryOne(
            'SELECT * FROM users WHERE Email = ? OR (Username = ? AND Username IS NOT NULL)',
            [email, username || null]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.Email === email ? 'Email already exists.' : 'Username already taken.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await query(
            `INSERT INTO users (FullName, Email, Username, MobileNumber, Password, RoleId, OrganizationId, Status, IsEmailVerified, CreatedBy, CreatedDate) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())`,
            [fullName, email, username || null, mobileNumber || null, hashedPassword, roleId || null, organizationId || null, status || 'Active', req.user.UserId]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            data: { userId: result.insertId }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user.'
        });
    }
};

// Search user by phone number (for sponsor lookup)
const searchUserByPhone = async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone || phone.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least 10 digits'
            });
        }

        const user = await queryOne(
            `SELECT u.UserId, u.FullName, u.Email, u.MobileNumber, u.Username,
                    o.OrganizationName, o.OrganizationId
             FROM users u 
             LEFT JOIN organizations o ON u.OrganizationId = o.OrganizationId
             WHERE u.MobileNumber = ? AND u.Status = 'Active'`,
            [phone]
        );

        if (!user) {
            return res.json({
                success: true,
                found: false,
                data: null
            });
        }

        res.json({
            success: true,
            found: true,
            data: {
                userId: user.UserId,
                fullName: user.FullName,
                email: user.Email,
                mobileNumber: user.MobileNumber,
                organizationName: user.OrganizationName,
                organizationId: user.OrganizationId
            }
        });
    } catch (error) {
        console.error('Search user by phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search user.'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    assignRole,
    updateUserStatus,
    assignOrganization,
    updateProfile,
    changePassword,
    createUser,
    searchUserByPhone
};
