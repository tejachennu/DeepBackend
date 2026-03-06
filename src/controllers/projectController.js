const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create a new project
exports.createProject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const projectId = await Project.create({
            ...req.body,
            createdBy: req.user.userId
        });

        const project = await Project.findById(projectId);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: { project }
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, message: 'Failed to create project' });
    }
};

// Get all projects
exports.getAllProjects = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
            startDateFrom: req.query.startDateFrom,
            startDateTo: req.query.startDateTo,
            isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const projects = await Project.findAll(filters);

        res.json({
            success: true,
            data: {
                projects,
                count: projects.length
            }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch projects' });
    }
};

// Get project by ID
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({
            success: true,
            data: { project }
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch project' });
    }
};

// Update project
exports.updateProject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }



        const updated = await Project.update(req.params.id, req.body, req.user.userId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedProject = await Project.findById(req.params.id);

        res.json({
            success: true,
            message: 'Project updated successfully',
            data: { project: updatedProject }
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, message: 'Failed to update project' });
    }
};

// Delete project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }



        await Project.delete(req.params.id, req.user.userId);

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete project' });
    }
};

// Get project statistics
exports.getProjectStats = async (req, res) => {
    try {
        const stats = await Project.getStats();

        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
};

// Upload project banner
exports.uploadBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Azure Blob URL set by azureUploadSingle middleware
        const bannerUrl = req.file.path;

        await Project.update(req.params.id, { bannerUrl }, req.user.userId);

        res.json({
            success: true,
            message: 'Banner uploaded successfully',
            data: { bannerUrl }
        });
    } catch (error) {
        console.error('Upload banner error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload banner' });
    }
};
