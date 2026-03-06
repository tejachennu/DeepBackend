const express = require('express');
const permissionController = require('../controllers/projectPermissionController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body, param } = require('express-validator');
const { documentUpload, azureUploadSingle } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const permissionValidation = [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('permissionType').notEmpty().withMessage('Permission type is required')
];

const commentValidation = [
    body('commentText').notEmpty().withMessage('Comment text is required')
];

const assignmentValidation = [
    body('userId').isInt().withMessage('User ID is required')
];

/**
 * @swagger
 * /api/project-permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - permissionType
 *             properties:
 *               projectId:
 *                 type: integer
 *               permissionType:
 *                 type: string
 *               description:
 *                 type: string
 *               assignedToUserId:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Permission created successfully
 */
router.post('/', authenticate, permissionValidation, permissionController.createPermission);

/**
 * @swagger
 * /api/project-permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, InProgress, Submitted, Approved, Rejected]
 *       - in: query
 *         name: assignedToUserId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', authenticate, permissionController.getAllPermissions);

/**
 * @swagger
 * /api/project-permissions/my:
 *   get:
 *     summary: Get my assigned permissions
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned permissions
 */
router.get('/my', authenticate, permissionController.getMyPermissions);

/**
 * @swagger
 * /api/project-permissions/project/{projectId}:
 *   get:
 *     summary: Get permissions by project
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of project permissions
 */
router.get('/project/:projectId', authenticate, param('projectId').isInt(), permissionController.getPermissionsByProject);

/**
 * @swagger
 * /api/project-permissions/{id}:
 *   get:
 *     summary: Get permission by ID with documents, comments, and assignments
 *     tags: [Project Permissions]
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
 *         description: Permission details with related data
 */
router.get('/:id', authenticate, param('id').isInt(), permissionController.getPermissionById);

/**
 * @swagger
 * /api/project-permissions/{id}:
 *   put:
 *     summary: Update permission
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
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
 *               permissionType:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated
 */
router.put('/:id', authenticate, param('id').isInt(), permissionController.updatePermission);

/**
 * @swagger
 * /api/project-permissions/{id}:
 *   delete:
 *     summary: Delete permission
 *     tags: [Project Permissions]
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
 *         description: Permission deleted
 */
router.delete('/:id', authenticate, param('id').isInt(), permissionController.deletePermission);

// ==================== Status Actions ====================

/**
 * @swagger
 * /api/project-permissions/{id}/submit:
 *   post:
 *     summary: Submit permission for approval
 *     tags: [Project Permissions]
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
 *         description: Permission submitted
 */
router.post('/:id/submit', authenticate, param('id').isInt(), permissionController.submitPermission);

/**
 * @swagger
 * /api/project-permissions/{id}/approve:
 *   post:
 *     summary: Approve permission
 *     tags: [Project Permissions]
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
 *         description: Permission approved
 */
router.post('/:id/approve', authenticate, requireAdmin, param('id').isInt(), permissionController.approvePermission);

/**
 * @swagger
 * /api/project-permissions/{id}/reject:
 *   post:
 *     summary: Reject permission
 *     tags: [Project Permissions]
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
 *         description: Permission rejected
 */
router.post('/:id/reject', authenticate, requireAdmin, param('id').isInt(), permissionController.rejectPermission);

// ==================== Documents ====================

/**
 * @swagger
 * /api/project-permissions/{id}/documents:
 *   post:
 *     summary: Upload document
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 */
router.post('/:id/documents', authenticate, param('id').isInt(), documentUpload.single('document'), azureUploadSingle('documents'), permissionController.uploadDocument);

/**
 * @swagger
 * /api/project-permissions/{id}/documents:
 *   get:
 *     summary: Get documents
 *     tags: [Project Permissions]
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
 *         description: List of documents
 */
router.get('/:id/documents', authenticate, param('id').isInt(), permissionController.getDocuments);

/**
 * @swagger
 * /api/project-permissions/{id}/documents/{documentId}:
 *   delete:
 *     summary: Delete document
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.delete('/:id/documents/:documentId', authenticate, permissionController.deleteDocument);

// ==================== Comments ====================

/**
 * @swagger
 * /api/project-permissions/{id}/comments:
 *   post:
 *     summary: Add comment
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - commentText
 *             properties:
 *               commentText:
 *                 type: string
 *               parentCommentId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/:id/comments', authenticate, param('id').isInt(), commentValidation, permissionController.addComment);

/**
 * @swagger
 * /api/project-permissions/{id}/comments:
 *   get:
 *     summary: Get comments with replies
 *     tags: [Project Permissions]
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
 *         description: List of comments
 */
router.get('/:id/comments', authenticate, param('id').isInt(), permissionController.getComments);

/**
 * @swagger
 * /api/project-permissions/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete('/:id/comments/:commentId', authenticate, permissionController.deleteComment);

// ==================== Assignments ====================

/**
 * @swagger
 * /api/project-permissions/{id}/assignments:
 *   post:
 *     summary: Assign user to permission
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User assigned
 */
router.post('/:id/assignments', authenticate, param('id').isInt(), assignmentValidation, permissionController.assignUser);

/**
 * @swagger
 * /api/project-permissions/{id}/assignments:
 *   get:
 *     summary: Get assigned users
 *     tags: [Project Permissions]
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
 *         description: List of assigned users
 */
router.get('/:id/assignments', authenticate, param('id').isInt(), permissionController.getAssignedUsers);

/**
 * @swagger
 * /api/project-permissions/{id}/assignments/{userId}:
 *   delete:
 *     summary: Unassign user
 *     tags: [Project Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User unassigned
 */
router.delete('/:id/assignments/:userId', authenticate, permissionController.unassignUser);

module.exports = router;
