const Camp = require('../models/Camp');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// ==================== Camp CRUD ====================

// Create camp
exports.createCamp = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Verify project exists
        const project = await Project.findById(req.body.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const campId = await Camp.create({
            ...req.body,
            createdBy: req.user.UserId
        });

        const camp = await Camp.findById(campId);

        res.status(201).json({
            success: true,
            message: 'Camp created successfully',
            data: { camp }
        });
    } catch (error) {
        console.error('Create camp error:', error);
        res.status(500).json({ success: false, message: 'Failed to create camp' });
    }
};

// Get all camps
exports.getAllCamps = async (req, res) => {
    try {
        const filters = {
            projectId: req.query.projectId,
            campStatus: req.query.campStatus,
            campType: req.query.campType,
            campState: req.query.campState,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            search: req.query.search,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const camps = await Camp.findAll(filters);

        res.json({
            success: true,
            data: {
                camps,
                count: camps.length
            }
        });
    } catch (error) {
        console.error('Get camps error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch camps' });
    }
};

// Get camps by project
exports.getCampsByProject = async (req, res) => {
    try {
        const camps = await Camp.findByProjectId(req.params.projectId, {
            campStatus: req.query.campStatus,
            limit: req.query.limit,
            offset: req.query.offset
        });

        const stats = await Camp.getProjectStats(req.params.projectId);

        res.json({
            success: true,
            data: {
                camps,
                stats,
                count: camps.length
            }
        });
    } catch (error) {
        console.error('Get project camps error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch camps' });
    }
};

// Get camp by ID with media
exports.getCampById = async (req, res) => {
    try {
        const camp = await Camp.findById(req.params.id);

        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        // Get media (first page for images/videos)
        const userId = req.user ? req.user.UserId : null;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const images = await Camp.getImages(req.params.id, userId, limit, offset);
        const videos = await Camp.getVideos(req.params.id, userId, limit, offset);

        res.json({
            success: true,
            data: {
                camp,
                images,
                videos
            }
        });
    } catch (error) {
        console.error('Get camp error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch camp' });
    }
};

// Update camp
exports.updateCamp = async (req, res) => {
    try {
        const camp = await Camp.findById(req.params.id);
        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        const updated = await Camp.update(req.params.id, req.body, req.user.UserId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedCamp = await Camp.findById(req.params.id);

        res.json({
            success: true,
            message: 'Camp updated successfully',
            data: { camp: updatedCamp }
        });
    } catch (error) {
        console.error('Update camp error:', error);
        res.status(500).json({ success: false, message: 'Failed to update camp' });
    }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
    try {
        const { peopleAttended } = req.body;

        if (peopleAttended === undefined) {
            return res.status(400).json({ success: false, message: 'peopleAttended is required' });
        }

        const camp = await Camp.findById(req.params.id);
        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        await Camp.updateAttendance(req.params.id, peopleAttended, req.user.UserId);

        const updatedCamp = await Camp.findById(req.params.id);

        res.json({
            success: true,
            message: 'Attendance updated successfully',
            data: { camp: updatedCamp }
        });
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ success: false, message: 'Failed to update attendance' });
    }
};

// Delete camp
exports.deleteCamp = async (req, res) => {
    try {
        const roleCode = (req.user?.RoleCode || '').toUpperCase();
        if (roleCode !== 'SUPER_ADMIN' && roleCode !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can delete camps.' });
        }

        const camp = await Camp.findById(req.params.id);
        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        await Camp.delete(req.params.id, req.user.UserId);

        res.json({
            success: true,
            message: 'Camp deleted successfully'
        });
    } catch (error) {
        console.error('Delete camp error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete camp' });
    }
};

// ==================== Media Operations ====================

// Upload image(s)
exports.uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No images uploaded' });
        }

        const camp = await Camp.findById(req.params.id);
        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        const uploadedMedia = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await Camp.addMedia({
                campId: req.params.id,
                mediaType: 'IMAGE',
                mediaUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                caption: req.body.caption,
                uploadedBy: req.user.UserId
            });
            uploadedMedia.push({ mediaId, url: mediaUrl });
        }

        res.status(201).json({
            success: true,
            message: `${uploadedMedia.length} image(s) uploaded successfully`,
            data: { uploadedMedia }
        });
    } catch (error) {
        console.error('Upload images error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload images' });
    }
};

// Upload video(s)
exports.uploadVideos = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No videos uploaded' });
        }

        const camp = await Camp.findById(req.params.id);
        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        const uploadedMedia = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await Camp.addMedia({
                campId: req.params.id,
                mediaType: 'VIDEO',
                mediaUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                caption: req.body.caption,
                uploadedBy: req.user.UserId
            });
            uploadedMedia.push({ mediaId, url: mediaUrl });
        }

        res.status(201).json({
            success: true,
            message: `${uploadedMedia.length} video(s) uploaded successfully`,
            data: { uploadedMedia }
        });
    } catch (error) {
        console.error('Upload videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload videos' });
    }
};

// Get all media for a camp
exports.getMedia = async (req, res) => {
    try {
        const userId = req.user ? req.user.UserId : null;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const media = await Camp.getMedia(req.params.id, null, userId, limit, offset);

        res.json({
            success: true,
            data: {
                media,
                count: media.length
            }
        });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch media' });
    }
};

// Get images only
exports.getImages = async (req, res) => {
    try {
        const userId = req.user ? req.user.UserId : null;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const images = await Camp.getImages(req.params.id, userId, limit, offset);

        res.json({
            success: true,
            data: { images }
        });
    } catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch images' });
    }
};

// Get videos only
exports.getVideos = async (req, res) => {
    try {
        const userId = req.user ? req.user.UserId : null;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const videos = await Camp.getVideos(req.params.id, userId, limit, offset);

        res.json({
            success: true,
            data: { videos }
        });
    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch videos' });
    }
};

// Update media (caption, order)
exports.updateMedia = async (req, res) => {
    try {
        const updated = await Camp.updateMedia(req.params.mediaId, req.body);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made or media not found' });
        }

        res.json({
            success: true,
            message: 'Media updated successfully'
        });
    } catch (error) {
        console.error('Update media error:', error);
        res.status(500).json({ success: false, message: 'Failed to update media' });
    }
};

// Delete media
exports.deleteMedia = async (req, res) => {
    try {
        await Camp.deleteMedia(req.params.mediaId);

        res.json({
            success: true,
            message: 'Media deleted successfully'
        });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete media' });
    }
};

// Get project camp statistics
exports.getProjectStats = async (req, res) => {
    try {
        const stats = await Camp.getProjectStats(req.params.projectId);

        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        console.error('Get camp stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
};
// Upload camp banner
exports.uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        const campId = req.params.id;
        const bannerUrl = req.file.path; // Azure URL from middleware

        await Camp.update(campId, { bannerUrl }, req.user.UserId);

        res.json({
            success: true,
            message: 'Banner uploaded successfully',
            data: { bannerUrl }
        });
    } catch (error) {
        console.error('Upload camp banner error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload banner' });
    }
};
