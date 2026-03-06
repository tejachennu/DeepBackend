// Role-based access control middleware

// Role hierarchy for permission inheritance
const roleHierarchy = {
    'SUPER_ADMIN': 100,
    'ADMIN': 80,
    'ORG_ADMIN': 60,
    'STAFF': 40,
    'ORG_STAFF': 30,
    'VOLUNTEER': 20,
    'SPONSOR': 20
};

// Check if user has one of the required roles
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const userRoleCode = req.user.RoleCode;

        if (!userRoleCode) {
            return res.status(403).json({
                success: false,
                message: 'User has no assigned role.'
            });
        }

        // Check if user's role is in allowed roles
        if (allowedRoles.includes(userRoleCode)) {
            return next();
        }

        // Check for Super Admin (has all permissions)
        if (userRoleCode === 'SUPER_ADMIN') {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.'
        });
    };
};

// Check if user has minimum role level
const requireMinRole = (minRoleCode) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const userRoleCode = req.user.RoleCode;
        const userLevel = roleHierarchy[userRoleCode] || 0;
        const requiredLevel = roleHierarchy[minRoleCode] || 0;

        if (userLevel >= requiredLevel) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.'
        });
    };
};

// Organization Admin can only access their own organization
const requireOrgAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    // Super Admin and Admin can access all organizations
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user.RoleCode)) {
        return next();
    }

    // Organization Admin and Org Staff can only access their own organization
    if (req.user.RoleCode === 'ORG_ADMIN' || req.user.RoleCode === 'ORG_STAFF') {
        const requestedOrgId = parseInt(req.params.organizationId || req.body.organizationId);

        if (!req.user.OrganizationId) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to any organization.'
            });
        }

        if (requestedOrgId && requestedOrgId !== req.user.OrganizationId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own organization.'
            });
        }

        // Set organization ID from user if not specified
        if (!requestedOrgId) {
            req.body.organizationId = req.user.OrganizationId;
        }

        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
    });
};

// Check if user is admin (Super Admin or Admin)
const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');

// Check if user is Super Admin
const requireSuperAdmin = requireRole('SUPER_ADMIN');

// Check if user can manage organizations
const requireOrgManager = requireRole('SUPER_ADMIN', 'ADMIN', 'ORG_ADMIN', 'ORG_STAFF');

module.exports = {
    requireRole,
    requireMinRole,
    requireOrgAccess,
    requireAdmin,
    requireSuperAdmin,
    requireOrgManager,
    roleHierarchy
};
