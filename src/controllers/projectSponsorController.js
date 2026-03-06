const ProjectSponsor = require('../models/ProjectSponsor');
const { validationResult } = require('express-validator');

exports.create = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const id = await ProjectSponsor.create({ ...req.body, createdBy: req.user.userId });
        const sponsor = await ProjectSponsor.findById(id);
        res.status(201).json({ success: true, message: 'Sponsor created', data: { sponsor } });
    } catch (error) {
        console.error('Create sponsor error:', error);
        res.status(500).json({ success: false, message: 'Failed to create' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const sponsors = await ProjectSponsor.findAll({
            projectId: req.query.projectId,
            sponsorType: req.query.sponsorType,
            sponsorshipType: req.query.sponsorshipType,
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        });
        res.json({ success: true, data: { sponsors, count: sponsors.length } });
    } catch (error) {
        console.error('Get sponsors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.getPublic = async (req, res) => {
    try {
        const sponsors = await ProjectSponsor.getPublicSponsors(req.params.projectId);
        res.json({ success: true, data: { sponsors } });
    } catch (error) {
        console.error('Get public sponsors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.getById = async (req, res) => {
    try {
        const sponsor = await ProjectSponsor.findById(req.params.id);
        if (!sponsor) return res.status(404).json({ success: false, message: 'Not found' });

        const images = await ProjectSponsor.getMedia(req.params.id, 'IMAGE');
        const videos = await ProjectSponsor.getMedia(req.params.id, 'VIDEO');
        res.json({ success: true, data: { sponsor, images, videos } });
    } catch (error) {
        console.error('Get sponsor error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.update = async (req, res) => {
    try {
        const sponsor = await ProjectSponsor.findById(req.params.id);
        if (!sponsor) return res.status(404).json({ success: false, message: 'Not found' });

        await ProjectSponsor.update(req.params.id, req.body, req.user.userId);
        const updated = await ProjectSponsor.findById(req.params.id);
        res.json({ success: true, message: 'Updated successfully', data: { sponsor: updated } });
    } catch (error) {
        console.error('Update sponsor error:', error);
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

exports.delete = async (req, res) => {
    try {
        const sponsor = await ProjectSponsor.findById(req.params.id);
        if (!sponsor) return res.status(404).json({ success: false, message: 'Not found' });

        await ProjectSponsor.delete(req.params.id, req.user.userId);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete sponsor error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

exports.uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No images' });

        const sponsor = await ProjectSponsor.findById(req.params.id);
        if (!sponsor) return res.status(404).json({ success: false, message: 'Not found' });

        const uploaded = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await ProjectSponsor.addMedia({
                projectSponsorId: req.params.id,
                mediaType: 'IMAGE',
                mediaUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                caption: req.body.caption,
                uploadedBy: req.user.userId
            });
            uploaded.push({ mediaId, url: mediaUrl });
        }
        res.status(201).json({ success: true, message: `${uploaded.length} image(s) uploaded`, data: { uploaded } });
    } catch (error) {
        console.error('Upload images error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload' });
    }
};

exports.uploadVideos = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No videos' });

        const sponsor = await ProjectSponsor.findById(req.params.id);
        if (!sponsor) return res.status(404).json({ success: false, message: 'Not found' });

        const uploaded = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await ProjectSponsor.addMedia({
                projectSponsorId: req.params.id,
                mediaType: 'VIDEO',
                mediaUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                caption: req.body.caption,
                uploadedBy: req.user.userId
            });
            uploaded.push({ mediaId, url: mediaUrl });
        }
        res.status(201).json({ success: true, message: `${uploaded.length} video(s) uploaded`, data: { uploaded } });
    } catch (error) {
        console.error('Upload videos error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload' });
    }
};

exports.getMedia = async (req, res) => {
    try {
        const media = await ProjectSponsor.getMedia(req.params.id);
        res.json({ success: true, data: { media } });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        await ProjectSponsor.deleteMedia(req.params.mediaId);
        res.json({ success: true, message: 'Media deleted' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const summary = await ProjectSponsor.getSummary(req.params.projectId);
        res.json({ success: true, data: { summary } });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};
