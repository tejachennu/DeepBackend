const Feed = require('../models/Feed');
const { validationResult } = require('express-validator');

exports.getFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.user.UserId;
        console.log('[Feed] getFeed called - userId:', userId, 'limit:', limit, 'offset:', offset);
        const feed = await Feed.getFeed(userId, limit, offset);

        res.json({
            success: true,
            data: { feed }
        });
    } catch (error) {
        console.error('Get feed error:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch feed' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const result = await Feed.toggleLike(req.params.mediaId, req.user.UserId);
        res.json({
            success: true,
            message: result.liked ? 'Media liked' : 'Media unliked',
            data: result
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;
        const comments = await Feed.getComments(req.params.mediaId, limit, offset);

        res.json({
            success: true,
            data: { comments }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { text } = req.body;
        const commentId = await Feed.addComment(req.params.mediaId, req.user.UserId, text.trim());

        res.status(201).json({
            success: true,
            message: 'Comment added',
            data: { commentId }
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const success = await Feed.deleteComment(req.params.commentId, req.user.UserId, req.user.RoleCode);

        if (!success) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment or comment not found' });
        }

        res.json({
            success: true,
            message: 'Comment deleted'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment' });
    }
};
