const VolunteerFormField = require('../models/VolunteerFormField');
const VolunteerApplication = require('../models/VolunteerApplication');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// ==================== Form Fields (Admin) ====================

exports.createField = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const project = await Project.findById(req.body.projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const fieldId = await VolunteerFormField.create({
            ...req.body,
            createdBy: req.user.UserId
        });

        const field = await VolunteerFormField.findById(fieldId);

        res.status(201).json({
            success: true,
            message: 'Form field created successfully',
            data: { field }
        });
    } catch (error) {
        console.error('Create form field error:', error);
        res.status(500).json({ success: false, message: 'Failed to create form field' });
    }
};

exports.getFields = async (req, res) => {
    try {
        const fields = await VolunteerFormField.findByProject(req.params.projectId);
        res.json({ success: true, data: { fields, count: fields.length } });
    } catch (error) {
        console.error('Get form fields error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch form fields' });
    }
};

exports.updateField = async (req, res) => {
    try {
        const field = await VolunteerFormField.findById(req.params.id);
        if (!field) return res.status(404).json({ success: false, message: 'Field not found' });

        await VolunteerFormField.update(req.params.id, req.body, req.user.UserId);
        const updated = await VolunteerFormField.findById(req.params.id);

        res.json({ success: true, message: 'Field updated', data: { field: updated } });
    } catch (error) {
        console.error('Update form field error:', error);
        res.status(500).json({ success: false, message: 'Failed to update field' });
    }
};

exports.deleteField = async (req, res) => {
    try {
        const field = await VolunteerFormField.findById(req.params.id);
        if (!field) return res.status(404).json({ success: false, message: 'Field not found' });

        await VolunteerFormField.delete(req.params.id, req.user.UserId);
        res.json({ success: true, message: 'Field deleted' });
    } catch (error) {
        console.error('Delete form field error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete field' });
    }
};

// ==================== Applications (User) ====================

exports.applyVolunteer = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const project = await Project.findById(req.body.projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Check if already applied
        const existing = await VolunteerApplication.checkDuplicate(req.body.projectId, req.user.UserId);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `You have already applied for this project. Status: ${existing.Status}`
            });
        }

        // Validate required custom fields
        const fields = await VolunteerFormField.findByProject(req.body.projectId);
        const requiredFields = fields.filter(f => f.IsRequired);
        const responses = req.body.responses || [];

        for (const field of requiredFields) {
            const response = responses.find(r => r.fieldId === field.FieldId);
            if (!response || !response.value || response.value.toString().trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `Field "${field.FieldLabel}" is required`
                });
            }
        }

        const applicationId = await VolunteerApplication.apply({
            projectId: req.body.projectId,
            userId: req.user.UserId,
            message: req.body.message,
            skills: req.body.skills,
            availability: req.body.availability,
            previousExperience: req.body.previousExperience,
            responses: req.body.responses
        });

        const application = await VolunteerApplication.findById(applicationId);

        res.status(201).json({
            success: true,
            message: 'Volunteer application submitted successfully',
            data: { application }
        });
    } catch (error) {
        console.error('Apply volunteer error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit application' });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const applications = await VolunteerApplication.findByUser(req.user.UserId);
        res.json({ success: true, data: { applications, count: applications.length } });
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

// ==================== Applications (Admin) ====================

exports.getApplicationsByProject = async (req, res) => {
    try {
        const applications = await VolunteerApplication.findByProject(req.params.projectId, {
            status: req.query.status,
            limit: req.query.limit,
            offset: req.query.offset
        });

        const counts = await VolunteerApplication.getCountByProject(req.params.projectId);

        res.json({
            success: true,
            data: {
                applications,
                counts: counts.reduce((acc, c) => ({ ...acc, [c.Status]: c.count }), {}),
                total: applications.length
            }
        });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

exports.getApplicationById = async (req, res) => {
    try {
        const application = await VolunteerApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        res.json({ success: true, data: { application } });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch application' });
    }
};

exports.acceptApplication = async (req, res) => {
    try {
        const application = await VolunteerApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        if (application.Status === 'Accepted') {
            return res.status(400).json({
                success: false,
                message: `Application has already been accepted`
            });
        }

        await VolunteerApplication.accept(req.params.id, req.user.UserId, req.body.adminNotes);
        const updated = await VolunteerApplication.findById(req.params.id);

        res.json({ success: true, message: 'Volunteer accepted', data: { application: updated } });
    } catch (error) {
        console.error('Accept application error:', error);
        res.status(500).json({ success: false, message: 'Failed to accept application' });
    }
};

exports.rejectApplication = async (req, res) => {
    try {
        const application = await VolunteerApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        if (application.Status === 'Rejected') {
            return res.status(400).json({
                success: false,
                message: `Application has already been rejected`
            });
        }

        await VolunteerApplication.reject(req.params.id, req.user.UserId, req.body.adminNotes);
        const updated = await VolunteerApplication.findById(req.params.id);

        res.json({ success: true, message: 'Volunteer rejected', data: { application: updated } });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject application' });
    }
};
exports.updateApplication = async (req, res) => {
    try {
        const application = await VolunteerApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        await VolunteerApplication.update(req.params.id, req.body, req.user.UserId);
        const updated = await VolunteerApplication.findById(req.params.id);

        res.json({ success: true, message: 'Application updated', data: { application: updated } });
    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({ success: false, message: 'Failed to update application' });
    }
};

exports.deleteApplication = async (req, res) => {
    try {
        const application = await VolunteerApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        await VolunteerApplication.delete(req.params.id);

        res.json({ success: true, message: 'Application deleted' });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete application' });
    }
};
