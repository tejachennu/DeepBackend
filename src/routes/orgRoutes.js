const express = require('express');
const orgController = require('../controllers/orgController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireOrgManager, requireOrgAccess } = require('../middleware/rbac');
const { organizationValidation, idParamValidation } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/organizations/types:
 *   get:
 *     summary: Get available organization types
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organization types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [Orphanage, School, NGO, Shelter Home]
 */
router.get('/types', orgController.getOrganizationTypes);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations (filtered by role)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - Admin/Super Admin: See all organizations
 *       - Organization Admin: See only their organization
 *       - Others: See active organizations
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Orphanage, School, NGO, Shelter Home]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Organization'
 *                     pagination:
 *                       type: object
 */
router.get('/', orgController.getAllOrganizations);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Organization details with member count
 *       403:
 *         description: Org Admin can only view their organization
 *       404:
 *         description: Organization not found
 */
router.get('/:id', idParamValidation, orgController.getOrganizationById);

/**
 * @swagger
 * /api/organizations/{id}/members:
 *   get:
 *     summary: Get organization members
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of organization members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/:id/members', idParamValidation, orgController.getOrganizationMembers);

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create organization (Admin or Org Admin)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - organizationType
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: Hope Foundation
 *               organizationType:
 *                 type: string
 *                 enum: [Orphanage, School, NGO, Shelter Home]
 *               registrationNumber:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactMobile:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               totalBeneficiaries:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post('/', requireOrgManager, organizationValidation, orgController.createOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Update organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       - Admin/Super Admin: Can update any organization
 *       - Organization Admin: Can only update their own organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationName:
 *                 type: string
 *               organizationType:
 *                 type: string
 *                 enum: [Orphanage, School, NGO, Shelter Home]
 *               contactPersonName:
 *                 type: string
 *               contactMobile:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               pincode:
 *                 type: string
 *               totalBeneficiaries:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Organization updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Organization not found
 */
router.put('/:id', requireOrgManager, idParamValidation, orgController.updateOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: Delete organization (Admin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Organization deleted
 *       400:
 *         description: Organization has members assigned
 *       404:
 *         description: Organization not found
 */
router.delete('/:id', requireAdmin, idParamValidation, orgController.deleteOrganization);

module.exports = router;
