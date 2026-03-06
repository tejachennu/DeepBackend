const { validationResult, body, param } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Auth validation rules
const signupValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('mobileNumber')
        .optional()
        .matches(/^[0-9]{10,15}$/)
        .withMessage('Please provide a valid mobile number'),
    handleValidationErrors
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

const otpValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
    handleValidationErrors
];

// Role validation rules
const roleValidation = [
    body('roleName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2 and 50 characters'),
    body('roleCode')
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage('Role code must be between 2 and 20 characters')
        .matches(/^[A-Z_]+$/)
        .withMessage('Role code must be uppercase letters and underscores only'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    handleValidationErrors
];

// Organization validation rules
const organizationValidation = [
    body('organizationName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Organization name must be between 2 and 100 characters'),
    body('organizationType')
        .isIn(['Orphanage', 'School', 'NGO', 'Shelter Home'])
        .withMessage('Invalid organization type'),
    body('contactPersonName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Contact person name cannot exceed 100 characters'),
    body('contactMobile')
        .optional()
        .matches(/^[0-9]{10,15}$/)
        .withMessage('Please provide a valid contact mobile number'),
    body('contactEmail')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid contact email'),
    body('city')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('City name cannot exceed 50 characters'),
    body('state')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('State name cannot exceed 50 characters'),
    body('pincode')
        .optional()
        .matches(/^[0-9]{5,10}$/)
        .withMessage('Please provide a valid pincode'),
    handleValidationErrors
];

// ID parameter validation
const idParamValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid ID parameter'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    signupValidation,
    loginValidation,
    otpValidation,
    roleValidation,
    organizationValidation,
    idParamValidation
};
