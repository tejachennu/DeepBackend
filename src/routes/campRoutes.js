const express = require('express');
const campController = require('../controllers/campController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { imageUpload, videoUpload, bannerUpload, azureUploadSingle, azureUploadMultiple } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const campValidation = [
    body('projectId').isInt().withMessage('Project ID is required'),
    body('campName').notEmpty().withMessage('Camp name is required')
];

/**
 * @swagger
 * /api/camps:
 *   post:
 *     summary: Create a new camp
 *     tags: [Camps]
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
 *               - campName
 *             properties:
 *               projectId:
 *                 type: integer
 *               campName:
 *                 type: string
 *               campDescription:
 *                 type: string
 *               campType:
 *                 type: string
 *               campAddress:
 *                 type: string
 *               campPincode:
 *                 type: string
 *               campState:
 *                 type: string
 *               campCity:
 *                 type: string
 *               peopleExpected:
 *                 type: integer
 *               registrationFormLink:
 *                 type: string
 *               excelDataLink:
 *                 type: string
 *               campStartDate:
 *                 type: string
 *                 format: date-time
 *               campEndDate:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Camp created successfully
 */
router.post('/', authenticate, campValidation, campController.createCamp);

/**
 * @swagger
 * /api/camps:
 *   get:
 *     summary: Get all camps
 *     tags: [Camps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: campStatus
 *         schema:
 *           type: string
 *           enum: [Planned, Ongoing, Completed, Cancelled]
 *       - in: query
 *         name: campType
 *         schema:
 *           type: string
 *       - in: query
 *         name: campState
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of camps
 */
router.get('/', authenticate, campController.getAllCamps);

/**
 * @swagger
 * /api/camps/project/{projectId}:
 *   get:
 *     summary: Get camps by project with statistics
 *     tags: [Camps]
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
 *         description: List of camps with project stats
 */
router.get('/project/:projectId', authenticate, param('projectId').isInt(), campController.getCampsByProject);

/**
 * @swagger
 * /api/camps/project/{projectId}/stats:
 *   get:
 *     summary: Get camp statistics for a project
 *     tags: [Camps]
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
 *         description: Camp statistics
 */
router.get('/project/:projectId/stats', authenticate, param('projectId').isInt(), campController.getProjectStats);

/**
 * @swagger
 * /api/camps/{id}:
 *   get:
 *     summary: Get camp by ID with images and videos
 *     tags: [Camps]
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
 *         description: Camp with media
 */
router.get('/:id', authenticate, param('id').isInt(), campController.getCampById);

/**
 * @swagger
 * /api/camps/{id}:
 *   put:
 *     summary: Update camp
 *     tags: [Camps]
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
 *         description: Camp updated
 */
router.put('/:id', authenticate, param('id').isInt(), campController.updateCamp);

/**
 * @swagger
 * /api/camps/{id}/attendance:
 *   patch:
 *     summary: Update camp attendance
 *     tags: [Camps]
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
 *               - peopleAttended
 *             properties:
 *               peopleAttended:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Attendance updated
 */
router.patch('/:id/attendance', authenticate, param('id').isInt(), campController.updateAttendance);

/**
 * @swagger
 * /api/camps/{id}:
 *   delete:
 *     summary: Delete camp
 *     tags: [Camps]
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
 *         description: Camp deleted
 */
router.delete('/:id', authenticate, param('id').isInt(), campController.deleteCamp);

// ==================== Media Upload ====================

/**
 * @swagger
 * /api/camps/{id}/images:
 *   post:
 *     summary: Upload images to camp
 *     tags: [Camp Media]
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
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Images uploaded
 */
router.post('/:id/images', authenticate, param('id').isInt(), imageUpload.array('images', 10), azureUploadMultiple('camps'), campController.uploadImages);

/**
 * @swagger
 * /api/camps/{id}/videos:
 *   post:
 *     summary: Upload videos to camp
 *     tags: [Camp Media]
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
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Videos uploaded
 */
router.post('/:id/videos', authenticate, param('id').isInt(), videoUpload.array('videos', 5), azureUploadMultiple('camps'), campController.uploadVideos);

/**
 * @swagger
 * /api/camps/{id}/media:
 *   get:
 *     summary: Get all media for a camp
 *     tags: [Camp Media]
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
 *         description: All media
 */
router.get('/:id/media', authenticate, param('id').isInt(), campController.getMedia);

/**
 * @swagger
 * /api/camps/{id}/images:
 *   get:
 *     summary: Get images for a camp
 *     tags: [Camp Media]
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
 *         description: Camp images
 */
router.get('/:id/images', authenticate, param('id').isInt(), campController.getImages);

/**
 * @swagger
 * /api/camps/{id}/videos:
 *   get:
 *     summary: Get videos for a camp
 *     tags: [Camp Media]
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
 *         description: Camp videos
 */
router.get('/:id/videos', authenticate, param('id').isInt(), campController.getVideos);

/**
 * @swagger
 * /api/camps/{id}/media/{mediaId}:
 *   put:
 *     summary: Update media (caption, order)
 *     tags: [Camp Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Media updated
 */
router.put('/:id/media/:mediaId', authenticate, campController.updateMedia);

/**
 * @swagger
 * /api/camps/{id}/media/{mediaId}:
 *   delete:
 *     summary: Delete media
 *     tags: [Camp Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Media deleted
 */
router.delete('/:id/media/:mediaId', authenticate, campController.deleteMedia);

/**
 * @swagger
 * /api/camps/{id}/banner:
 *   post:
 *     summary: Upload camp banner
 *     tags: [Camps]
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
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 */
router.post('/:id/banner', authenticate, param('id').isInt(), bannerUpload.single('banner'), azureUploadSingle('banners'), campController.uploadBanner);

module.exports = router;
