const express = require('express');
const feedController = require('../controllers/feedController');
const { authenticate } = require('../middleware/auth');
const { param, body } = require('express-validator');

const router = express.Router();

// Get the feed
router.get('/', authenticate, feedController.getFeed);

// Like / Unlike media
router.post(
    '/:mediaId/like',
    authenticate,
    [param('mediaId').isInt().withMessage('Valid Media ID is required')],
    feedController.toggleLike
);

// Get comments for media
router.get(
    '/:mediaId/comments',
    authenticate,
    [param('mediaId').isInt().withMessage('Valid Media ID is required')],
    feedController.getComments
);

// Add a comment
router.post(
    '/:mediaId/comments',
    authenticate,
    [
        param('mediaId').isInt().withMessage('Valid Media ID is required'),
        body('text').notEmpty().withMessage('Comment text is required')
    ],
    feedController.addComment
);

// Delete a comment
router.delete(
    '/comments/:commentId',
    authenticate,
    [param('commentId').isInt().withMessage('Valid Comment ID is required')],
    feedController.deleteComment
);

module.exports = router;
