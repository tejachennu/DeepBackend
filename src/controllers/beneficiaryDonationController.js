const BeneficiaryDonation = require('../models/BeneficiaryDonation');
const { validationResult } = require('express-validator');

exports.create = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const id = await BeneficiaryDonation.create({ ...req.body, createdBy: req.user.userId });
        const donation = await BeneficiaryDonation.findById(id);
        res.status(201).json({ success: true, message: 'Beneficiary donation created', data: { donation } });
    } catch (error) {
        console.error('Create beneficiary donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const donations = await BeneficiaryDonation.findAll({
            projectId: req.query.projectId,
            organizationId: req.query.organizationId,
            status: req.query.status,
            donationType: req.query.donationType,
            search: req.query.search,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        });
        res.json({ success: true, data: { donations, count: donations.length } });
    } catch (error) {
        console.error('Get beneficiary donations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.getById = async (req, res) => {
    try {
        const donation = await BeneficiaryDonation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        const images = await BeneficiaryDonation.getMedia(req.params.id, 'IMAGE');
        const videos = await BeneficiaryDonation.getMedia(req.params.id, 'VIDEO');
        res.json({ success: true, data: { donation, images, videos } });
    } catch (error) {
        console.error('Get beneficiary donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.update = async (req, res) => {
    try {
        const donation = await BeneficiaryDonation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        await BeneficiaryDonation.update(req.params.id, req.body, req.user.userId);
        const updated = await BeneficiaryDonation.findById(req.params.id);
        res.json({ success: true, message: 'Updated successfully', data: { donation: updated } });
    } catch (error) {
        console.error('Update beneficiary donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

exports.delete = async (req, res) => {
    try {
        const donation = await BeneficiaryDonation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        await BeneficiaryDonation.delete(req.params.id, req.user.userId);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete beneficiary donation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

exports.uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No images' });

        const donation = await BeneficiaryDonation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        const uploaded = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await BeneficiaryDonation.addMedia({
                beneficiaryDonationId: req.params.id,
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

        const donation = await BeneficiaryDonation.findById(req.params.id);
        if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

        const uploaded = [];
        for (const file of req.files) {
            const mediaUrl = file.path; // Azure URL set by azureUploadMultiple middleware
            const mediaId = await BeneficiaryDonation.addMedia({
                beneficiaryDonationId: req.params.id,
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
        const media = await BeneficiaryDonation.getMedia(req.params.id);
        res.json({ success: true, data: { media } });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        await BeneficiaryDonation.deleteMedia(req.params.mediaId);
        res.json({ success: true, message: 'Media deleted' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const summary = await BeneficiaryDonation.getSummary(req.params.projectId);
        res.json({ success: true, data: { summary } });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};
