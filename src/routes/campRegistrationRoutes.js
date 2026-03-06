const express = require('express');
const router = express.Router();
const controller = require('../controllers/campRegistrationController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

// ========== PUBLIC ROUTES (no auth) ==========

// Get form fields for a camp (for public registration form)
router.get('/public/:campCode/fields', controller.getPublicFields);

// Submit registration (public)
router.post('/public/register', [
    body('campId').isInt().withMessage('Camp ID is required'),
    body('responses').isArray().withMessage('Responses are required'),
], controller.register);

// ========== ADMIN ROUTES (auth required) ==========

// Field management
router.post('/fields', authenticate, [
    body('campId').isInt().withMessage('Camp ID is required'),
    body('fieldName').notEmpty().withMessage('Field name is required'),
    body('fieldLabel').notEmpty().withMessage('Field label is required'),
], controller.createField);

router.get('/fields/:campId', authenticate, controller.getFields);

router.put('/fields/:fieldId', authenticate, controller.updateField);

router.delete('/fields/:fieldId', authenticate, controller.deleteField);

// Registration management
router.get('/registrations/:campId', authenticate, controller.getRegistrations);

router.get('/registration/:registrationId', authenticate, controller.getRegistration);

router.put('/registration/:registrationId', authenticate, controller.updateRegistration);

router.delete('/registration/:registrationId', authenticate, controller.deleteRegistration);

// Export
router.get('/export/:campId', authenticate, controller.exportExcel);

module.exports = router;
