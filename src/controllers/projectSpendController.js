const ProjectSpend = require('../models/ProjectSpend');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// Create a new spend
exports.createSpend = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Verify project exists and user has access
        const project = await Project.findById(req.body.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Check access for non-admins
        // if (req.user.RoleCode !== 'SUPER_ADMIN' && req.user.RoleCode !== 'ADMIN') {
        //     if (project.OrganizationId !== req.user.OrganizationId) {
        //         return res.status(403).json({ success: false, message: 'Access denied' });
        //     }
        // }

        const spendId = await ProjectSpend.create({
            ...req.body,
            createdBy: req.user.userId
        });

        const spend = await ProjectSpend.findById(spendId);

        res.status(201).json({
            success: true,
            message: 'Expense recorded successfully',
            data: { spend }
        });
    } catch (error) {
        console.error('Create spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to record expense' });
    }
};

// Get all spends
exports.getAllSpends = async (req, res) => {
    try {
        const filters = {
            projectId: req.query.projectId,
            organizationId: req.query.organizationId,
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        // If not admin, filter by user's organization
        if (req.user.RoleCode !== 'SUPER_ADMIN' && req.user.RoleCode !== 'ADMIN') {
            filters.organizationId = req.user.OrganizationId;
        }

        const spends = await ProjectSpend.findAll(filters);

        res.json({
            success: true,
            data: {
                spends,
                count: spends.length
            }
        });
    } catch (error) {
        console.error('Get spends error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
    }
};

// Get spends by project
exports.getSpendsByProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Check access for non-admins
        if (req.user.RoleCode !== 'SUPER_ADMIN' && req.user.RoleCode !== 'ADMIN') {
            if (project.OrganizationId !== req.user.OrganizationId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        const filters = {
            status: req.query.status,
            paymentMode: req.query.paymentMode,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo
        };

        const spends = await ProjectSpend.findByProjectId(req.params.projectId, filters);
        const summary = await ProjectSpend.getSummaryByProject(req.params.projectId);
        const breakdown = await ProjectSpend.getBreakdownByPaymentMode(req.params.projectId);

        res.json({
            success: true,
            data: {
                spends,
                summary,
                breakdown,
                count: spends.length
            }
        });
    } catch (error) {
        console.error('Get project spends error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
    }
};

// Get spend by ID
exports.getSpendById = async (req, res) => {
    try {
        const spend = await ProjectSpend.findById(req.params.id);

        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({
            success: true,
            data: { spend }
        });
    } catch (error) {
        console.error('Get spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expense' });
    }
};

// Update spend
exports.updateSpend = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        // Cannot update approved/rejected spends
        if (spend.Status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update an approved or rejected expense'
            });
        }

        const updated = await ProjectSpend.update(req.params.id, req.body, req.user.userId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedSpend = await ProjectSpend.findById(req.params.id);

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: { spend: updatedSpend }
        });
    } catch (error) {
        console.error('Update spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to update expense' });
    }
};

// Approve spend
exports.approveSpend = async (req, res) => {
    try {
        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        if (spend.Status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'Expense has already been processed'
            });
        }

        await ProjectSpend.approve(req.params.id, req.user.userId);

        const updatedSpend = await ProjectSpend.findById(req.params.id);

        res.json({
            success: true,
            message: 'Expense approved successfully',
            data: { spend: updatedSpend }
        });
    } catch (error) {
        console.error('Approve spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve expense' });
    }
};

// Reject spend
exports.rejectSpend = async (req, res) => {
    try {
        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        if (spend.Status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'Expense has already been processed'
            });
        }

        await ProjectSpend.reject(req.params.id, req.user.userId);

        const updatedSpend = await ProjectSpend.findById(req.params.id);

        res.json({
            success: true,
            message: 'Expense rejected',
            data: { spend: updatedSpend }
        });
    } catch (error) {
        console.error('Reject spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject expense' });
    }
};

// Delete spend
exports.deleteSpend = async (req, res) => {
    try {
        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        await ProjectSpend.delete(req.params.id, req.user.userId);

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete expense' });
    }
};

// Upload bill image
exports.uploadBillImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        // Azure Blob URL set by azureUploadSingle middleware
        const billImageUrl = req.file.path;

        await ProjectSpend.update(req.params.id, { billImageUrl }, req.user.userId);

        res.json({
            success: true,
            message: 'Bill image uploaded successfully',
            data: { billImageUrl }
        });
    } catch (error) {
        console.error('Upload bill image error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload bill image' });
    }
};

// Settle a spend (reimburse own money expense)
exports.settleSpend = async (req, res) => {
    try {
        const spend = await ProjectSpend.findById(req.params.id);
        if (!spend) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        if (!spend.PaidWithOwnMoney) {
            return res.status(400).json({
                success: false,
                message: 'This expense was not paid with own money'
            });
        }

        if (spend.IsSettled) {
            return res.status(400).json({
                success: false,
                message: 'This expense has already been settled'
            });
        }

        // Admin/SuperAdmin can settle any expense, or creator can settle their own
        const isAdmin = req.user.RoleCode === 'SUPER_ADMIN' || req.user.RoleCode === 'ADMIN';
        const isCreator = spend.CreatedBy === req.user.UserId;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({
                success: false,
                message: 'You can only settle your own expenses'
            });
        }

        await ProjectSpend.settle(req.params.id, req.user.UserId, {
            settlementNotes: req.body.settlementNotes,
            settlementAmount: req.body.settlementAmount || spend.Amount
        });

        const updatedSpend = await ProjectSpend.findById(req.params.id);

        res.json({
            success: true,
            message: 'Expense settled successfully',
            data: { spend: updatedSpend }
        });
    } catch (error) {
        console.error('Settle spend error:', error);
        res.status(500).json({ success: false, message: 'Failed to settle expense' });
    }
};

// Get unsettled spends (own money expenses pending reimbursement)
exports.getUnsettledSpends = async (req, res) => {
    try {
        const projectId = req.query.projectId || null;
        const spends = await ProjectSpend.getUnsettled(projectId);

        res.json({
            success: true,
            data: {
                spends,
                count: spends.length
            }
        });
    } catch (error) {
        console.error('Get unsettled spends error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch unsettled expenses' });
    }
};
