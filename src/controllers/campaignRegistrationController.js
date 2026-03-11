const CampaignRegistrationField = require('../models/CampaignRegistrationField');
const CampaignRegistration = require('../models/CampaignRegistration');
const Campaign = require('../models/Campaign');
const { validationResult } = require('express-validator');

// ==================== Form Fields (Admin) ====================

exports.createField = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const fieldId = await CampaignRegistrationField.create({
            campaignId: req.body.campaignId,
            fieldName: req.body.fieldName,
            fieldLabel: req.body.fieldLabel,
            fieldType: req.body.fieldType,
            options: req.body.options,
            isRequired: req.body.isRequired,
            displayOrder: req.body.displayOrder,
            createdBy: req.user.UserId
        });

        const field = await CampaignRegistrationField.findById(fieldId);

        res.status(201).json({
            success: true,
            message: 'Registration field created',
            data: { field }
        });
    } catch (error) {
        console.error('Create campaign reg field error:', error);
        res.status(500).json({ success: false, message: 'Failed to create field' });
    }
};

exports.getFields = async (req, res) => {
    try {
        const fields = await CampaignRegistrationField.findByCampaign(req.params.campaignId);
        res.json({ success: true, data: { fields } });
    } catch (error) {
        console.error('Get campaign reg fields error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fields' });
    }
};

// Public endpoint - get fields for registration form (no auth)
exports.getFieldsPublic = async (req, res) => {
    try {
        const campaign = await Campaign.findByCode(req.params.campaignCode);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }
        if (campaign.CampaignStatus !== 'Active') {
            return res.status(400).json({ success: false, message: 'Campaign is not active' });
        }

        const fields = await CampaignRegistrationField.findByCampaign(campaign.CampaignId);
        res.json({
            success: true,
            data: {
                campaign: {
                    campaignId: campaign.CampaignId,
                    campaignName: campaign.CampaignName,
                    campaignCode: campaign.CampaignCode,
                    description: campaign.Description,
                    imageUrls: campaign.ImageUrls,
                    startDate: campaign.StartDate,
                    endDate: campaign.EndDate
                },
                fields
            }
        });
    } catch (error) {
        console.error('Get public fields error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch form' });
    }
};

exports.updateField = async (req, res) => {
    try {
        const updated = await CampaignRegistrationField.update(req.params.id, req.body, req.user.UserId);
        if (!updated) return res.status(400).json({ success: false, message: 'No changes made' });

        const field = await CampaignRegistrationField.findById(req.params.id);
        res.json({ success: true, message: 'Field updated', data: { field } });
    } catch (error) {
        console.error('Update campaign reg field error:', error);
        res.status(500).json({ success: false, message: 'Failed to update field' });
    }
};

exports.deleteField = async (req, res) => {
    try {
        const deleted = await CampaignRegistrationField.delete(req.params.id, req.user.UserId);
        if (!deleted) return res.status(404).json({ success: false, message: 'Field not found' });
        res.json({ success: true, message: 'Field deleted' });
    } catch (error) {
        console.error('Delete campaign reg field error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete field' });
    }
};

// ==================== Registration (Public - No Auth) ====================

exports.register = async (req, res) => {
    try {
        const { campaignCode, responses } = req.body;

        if (!campaignCode) {
            return res.status(400).json({ success: false, message: 'Campaign code is required' });
        }

        // Find campaign by code
        const campaign = await Campaign.findByCode(campaignCode);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Invalid campaign code' });
        }
        if (campaign.CampaignStatus !== 'Active') {
            return res.status(400).json({ success: false, message: 'Campaign is not active for registration' });
        }

        // Validate required fields
        const fields = await CampaignRegistrationField.findByCampaign(campaign.CampaignId);
        const requiredFields = fields.filter(f => f.IsRequired);
        const submittedResponses = responses || [];

        for (const field of requiredFields) {
            const response = submittedResponses.find(r => r.fieldId === field.FieldId);
            if (!response || !response.value || response.value.toString().trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `Field "${field.FieldLabel}" is required`
                });
            }
        }

        const registrationId = await CampaignRegistration.register({
            campaignId: campaign.CampaignId,
            responses: submittedResponses
        });

        const registration = await CampaignRegistration.findById(registrationId);

        res.status(201).json({
            success: true,
            message: 'Registration submitted successfully',
            data: { registration }
        });
    } catch (error) {
        console.error('Campaign registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit registration' });
    }
};

// ==================== Admin Operations ====================  

exports.getAll = async (req, res) => {
    try {
        const filters = {
            campaignId: req.query.campaignId,
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };

        const result = await CampaignRegistration.findAll(filters);

        res.json({
            success: true,
            data: {
                registrations: result.registrations,
                total: result.total,
                page: result.page,
                limit: parseInt(filters.limit)
            }
        });
    } catch (error) {
        console.error('Get campaign registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

exports.getById = async (req, res) => {
    try {
        const registration = await CampaignRegistration.findById(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
        res.json({ success: true, data: { registration } });
    } catch (error) {
        console.error('Get campaign registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registration' });
    }
};

exports.update = async (req, res) => {
    try {
        const registration = await CampaignRegistration.findById(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        await CampaignRegistration.update(req.params.id, req.body, req.user.UserId);

        const updated = await CampaignRegistration.findById(req.params.id);
        res.json({ success: true, message: 'Registration updated', data: { registration: updated } });
    } catch (error) {
        console.error('Update campaign registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to update registration' });
    }
};

exports.deleteRegistration = async (req, res) => {
    try {
        const registration = await CampaignRegistration.findById(req.params.id);
        if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });

        await CampaignRegistration.delete(req.params.id);
        res.json({ success: true, message: 'Registration deleted' });
    } catch (error) {
        console.error('Delete campaign registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete registration' });
    }
};

// Excel export
exports.exportExcel = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const campaignId = req.params.campaignId;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const { registrations, fields } = await CampaignRegistration.exportData(campaignId);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Registrations');

        // Build columns: S.No, Registration Date, Status + dynamic field labels
        const columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Registration Date', key: 'date', width: 20 },
            { header: 'Status', key: 'status', width: 12 }
        ];

        for (const field of fields) {
            columns.push({
                header: field.FieldLabel,
                key: `field_${field.FieldId}`,
                width: 20
            });
        }

        worksheet.columns = columns;

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Add data rows
        registrations.forEach((reg, index) => {
            const row = {
                sno: index + 1,
                date: reg.CreatedDate ? new Date(reg.CreatedDate).toLocaleDateString('en-IN') : '',
                status: reg.Status
            };

            // Map field responses
            for (const field of fields) {
                const response = (reg.responses || []).find(r => r.FieldId === field.FieldId);
                row[`field_${field.FieldId}`] = response ? response.ResponseValue : '';
            }

            worksheet.addRow(row);
        });

        // Set response headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=campaign_registrations_${campaign.CampaignCode || campaignId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Excel error:', error);
        res.status(500).json({ success: false, message: 'Failed to export data' });
    }
};
