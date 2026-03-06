const CampRegistrationField = require('../models/CampRegistrationField');
const CampRegistration = require('../models/CampRegistration');
const db = require('../config/database');
const ExcelJS = require('exceljs');

// ========== ADMIN: Form Fields ==========

// Create a field
exports.createField = async (req, res) => {
    try {
        const fieldId = await CampRegistrationField.create({
            ...req.body,
            createdBy: req.user.userId,
        });
        const field = await CampRegistrationField.findById(fieldId);
        res.status(201).json({ success: true, message: 'Field created', data: { field } });
    } catch (error) {
        console.error('Create field error:', error);
        res.status(500).json({ success: false, message: 'Failed to create field' });
    }
};

// Get fields for a camp
exports.getFields = async (req, res) => {
    try {
        const fields = await CampRegistrationField.findByCampId(req.params.campId);
        res.json({ success: true, data: { fields } });
    } catch (error) {
        console.error('Get fields error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fields' });
    }
};

// Update a field
exports.updateField = async (req, res) => {
    try {
        await CampRegistrationField.update(req.params.fieldId, req.body, req.user.userId);
        const field = await CampRegistrationField.findById(req.params.fieldId);
        res.json({ success: true, message: 'Field updated', data: { field } });
    } catch (error) {
        console.error('Update field error:', error);
        res.status(500).json({ success: false, message: 'Failed to update field' });
    }
};

// Delete a field
exports.deleteField = async (req, res) => {
    try {
        await CampRegistrationField.delete(req.params.fieldId, req.user.userId);
        res.json({ success: true, message: 'Field deleted' });
    } catch (error) {
        console.error('Delete field error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete field' });
    }
};

// ========== PUBLIC: Registration ==========

// Get fields for public form (no auth)
exports.getPublicFields = async (req, res) => {
    try {
        const { campCode } = req.params;

        // Lookup camp by code (or ID)
        let camp;
        if (isNaN(campCode)) {
            // Search by camp name or some code — for now look up by campId in query
            return res.status(400).json({ success: false, message: 'Invalid camp code' });
        } else {
            const [rows] = await db.execute(
                `SELECT CampId, CampName, CampDescription FROM camps WHERE CampId = ? AND IsDeleted = FALSE`,
                [campCode]
            );
            camp = rows[0];
        }

        if (!camp) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        const fields = await CampRegistrationField.findByCampId(camp.CampId);
        res.json({ success: true, data: { camp, fields } });
    } catch (error) {
        console.error('Get public fields error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch form' });
    }
};

// Public registration (no auth)
exports.register = async (req, res) => {
    try {
        const { campId, responses } = req.body;

        if (!campId || !responses) {
            return res.status(400).json({ success: false, message: 'Camp ID and responses are required' });
        }

        // Validate camp exists
        const [campRows] = await db.execute(
            `SELECT CampId FROM camps WHERE CampId = ? AND IsDeleted = FALSE`,
            [campId]
        );
        if (!campRows[0]) {
            return res.status(404).json({ success: false, message: 'Camp not found' });
        }

        // Validate required fields
        const fields = await CampRegistrationField.findByCampId(campId);
        const requiredFields = fields.filter(f => f.IsRequired);
        for (const rf of requiredFields) {
            const resp = responses.find(r => r.fieldId === rf.FieldId);
            if (!resp || !resp.value) {
                return res.status(400).json({ success: false, message: `${rf.FieldLabel} is required` });
            }
        }

        const registrationId = await CampRegistration.register({ campId, responses });
        res.status(201).json({ success: true, message: 'Registration successful', data: { registrationId } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to register' });
    }
};

// ========== ADMIN: Registrations ==========

// Get all registrations for a camp
exports.getRegistrations = async (req, res) => {
    try {
        const data = await CampRegistration.findByCampId(req.params.campId, {
            search: req.query.search,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

// Get single registration
exports.getRegistration = async (req, res) => {
    try {
        const reg = await CampRegistration.findById(req.params.registrationId);
        if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
        res.json({ success: true, data: { registration: reg } });
    } catch (error) {
        console.error('Get registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registration' });
    }
};

// Update registration
exports.updateRegistration = async (req, res) => {
    try {
        await CampRegistration.update(req.params.registrationId, req.body, req.user.userId);
        const reg = await CampRegistration.findById(req.params.registrationId);
        res.json({ success: true, message: 'Registration updated', data: { registration: reg } });
    } catch (error) {
        console.error('Update registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

// Delete (soft) registration
exports.deleteRegistration = async (req, res) => {
    try {
        await CampRegistration.delete(req.params.registrationId, req.user.userId);
        res.json({ success: true, message: 'Registration deleted' });
    } catch (error) {
        console.error('Delete registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

// Export to Excel
exports.exportExcel = async (req, res) => {
    try {
        const { registrations, fields } = await CampRegistration.getExportData(req.params.campId, {
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Registrations');

        // Header row
        const columns = [
            { header: 'Registration #', key: 'id', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Registered Date', key: 'date', width: 20 },
        ];
        fields.forEach(f => {
            columns.push({ header: f.FieldLabel, key: `field_${f.FieldId}`, width: 25 });
        });
        sheet.columns = columns;

        // Data rows
        registrations.forEach(reg => {
            const row = {
                id: reg.RegistrationId,
                status: reg.Status,
                date: new Date(reg.CreatedDate).toLocaleString('en-IN'),
            };
            (reg.responses || []).forEach(r => {
                row[`field_${r.FieldId}`] = r.ResponseValue;
            });
            sheet.addRow(row);
        });

        // Style header
        sheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=camp_registration_${req.params.campId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, message: 'Failed to export' });
    }
};
