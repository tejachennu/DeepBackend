const jwt = require('jsonwebtoken');
const config = require('../config');
const { queryOne } = require('../config/database');

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            // Fetch user from database
            const user = await queryOne(
                `SELECT u.*, r.RoleName, r.RoleCode 
                 FROM users u 
                 LEFT JOIN roles r ON u.RoleId = r.RoleId 
                 WHERE u.UserId = ? AND u.Status = 'Active'`,
                [decoded.userId]
            );

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or inactive.'
                });
            }

            // Check if user has an active device ID (forces logout from all devices if cleared)
            const activeDeviceCount = await queryOne(
                `SELECT COUNT(*) as count FROM user_devices WHERE UserId = ? AND IsActive = TRUE`,
                [decoded.userId]
            );

            if (activeDeviceCount.count === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Session invalidated. Please login again.' // Devices were cleared
                });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, config.jwt.secret);
                const user = await queryOne(
                    `SELECT u.*, r.RoleName, r.RoleCode 
                     FROM users u 
                     LEFT JOIN roles r ON u.RoleId = r.RoleId 
                     WHERE u.UserId = ? AND u.Status = 'Active'`,
                    [decoded.userId]
                );
                req.user = user;
            } catch (error) {
                // Token invalid, continue without user
            }
        }
        next();
    } catch (error) {
        next();
    }
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.UserId,
            email: user.Email,
            roleId: user.RoleId,
            roleCode: user.RoleCode
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

module.exports = {
    authenticate,
    optionalAuth,
    generateToken
};
