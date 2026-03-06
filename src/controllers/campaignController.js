const Campaign = require('../models/Campaign');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create campaign
exports.createCampaign = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Verify project exists (if projectId provided)
        if (req.body.projectId) {
            const project = await Project.findById(req.body.projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }
        }

        const campaignId = await Campaign.create({
            ...req.body,
            createdBy: req.user.userId
        });

        const campaign = await Campaign.findById(campaignId);

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: { campaign }
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to create campaign' });
    }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
    try {
        const filters = {
            projectId: req.query.projectId,
            campaignType: req.query.campaignType,
            campaignStatus: req.query.campaignStatus,
            search: req.query.search,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const campaigns = await Campaign.findAll(filters);

        res.json({
            success: true,
            data: {
                campaigns,
                count: campaigns.length
            }
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
    }
};

// Get public campaigns (for donation page - no auth required)
exports.getPublicCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.getPublicCampaigns({
            projectId: req.query.projectId,
            search: req.query.search,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        });

        res.json({
            success: true,
            data: { campaigns }
        });
    } catch (error) {
        console.error('Get public campaigns error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
    }
};

// Get campaign by ID
exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Get statistics
        const stats = await Campaign.getStats(req.params.id);

        res.json({
            success: true,
            data: { campaign, stats }
        });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
};

// Get campaign by ID - public (no auth required)
exports.getCampaignByIdPublic = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Only return public campaigns
        if (!campaign.IsPublic) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Get statistics
        const stats = await Campaign.getStats(req.params.id);

        res.json({
            success: true,
            data: { campaign, stats }
        });
    } catch (error) {
        console.error('Get public campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
};

// Get campaign by code (public - no auth required)
exports.getCampaignByCode = async (req, res) => {
    try {
        const campaign = await Campaign.findByCode(req.params.code);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (!campaign.IsPublic || campaign.CampaignStatus !== 'Active') {
            return res.status(404).json({ success: false, message: 'Campaign not available' });
        }

        // Get statistics for public view
        const stats = await Campaign.getStats(campaign.CampaignId);

        res.json({
            success: true,
            data: {
                campaign,
                stats: {
                    totalDonations: stats.totalDonations,
                    totalCollected: stats.totalCollected,
                    uniqueDonors: stats.uniqueDonors,
                    progress: campaign.TargetAmount > 0
                        ? Math.round((campaign.CollectedAmount / campaign.TargetAmount) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Get campaign by code error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
};

// Get campaign by code (authenticated - allows viewing draft/private)
exports.getCampaignByCodeAuth = async (req, res) => {
    try {
        const campaign = await Campaign.findByCode(req.params.code);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Get statistics
        const stats = await Campaign.getStats(campaign.CampaignId);

        res.json({
            success: true,
            data: {
                campaign,
                stats: {
                    totalDonations: stats.totalDonations,
                    totalCollected: stats.totalCollected,
                    uniqueDonors: stats.uniqueDonors,
                    progress: campaign.TargetAmount > 0
                        ? Math.round((campaign.CollectedAmount / campaign.TargetAmount) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Get campaign by code auth error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
    }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const updated = await Campaign.update(req.params.id, req.body, req.user.userId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedCampaign = await Campaign.findById(req.params.id);

        res.json({
            success: true,
            message: 'Campaign updated successfully',
            data: { campaign: updatedCampaign }
        });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to update campaign' });
    }
};

// Delete campaign
exports.deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        await Campaign.delete(req.params.id, req.user.userId);

        res.json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete campaign' });
    }
};

// Get campaign statistics
exports.getCampaignStats = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const stats = await Campaign.getStats(req.params.id);

        res.json({
            success: true,
            data: {
                stats,
                progress: campaign.TargetAmount > 0
                    ? Math.round((campaign.CollectedAmount / campaign.TargetAmount) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Get campaign stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
};

// Get campaign analytics (daily trends, payment breakdown, top donors)
exports.getCampaignAnalytics = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const analytics = await Campaign.getAnalytics(req.params.id);
        const stats = await Campaign.getStats(req.params.id);

        res.json({
            success: true,
            data: {
                campaign: {
                    campaignId: campaign.CampaignId,
                    campaignName: campaign.CampaignName,
                    targetAmount: campaign.TargetAmount,
                    collectedAmount: campaign.CollectedAmount,
                    campaignStatus: campaign.CampaignStatus
                },
                stats,
                analytics,
                progress: campaign.TargetAmount > 0
                    ? Math.round((campaign.CollectedAmount / campaign.TargetAmount) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Get campaign analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};
