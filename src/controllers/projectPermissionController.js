const ProjectGroundPermission = require('../models/ProjectGroundPermission');
const Project = require('../models/Project');
const { validationResult } = require('express-validator');

// ==================== Permissions ====================

// Create permission
exports.createPermission = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        console.log('Create permission request:', req.body);
        console.log('User from token:', req.user);

        // Verify project exists
        const project = await Project.findById(req.body.projectId);
        console.log('Project found:', project);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        console.log('Project found:', project);

        const permissionId = await ProjectGroundPermission.create({
            ...req.body,
            createdBy: req.user.UserId
        });

        console.log('Permission created with ID:', permissionId);

        const permission = await ProjectGroundPermission.findById(permissionId);
        console.log('Permission found:', permission);

        res.status(201).json({
            success: true,
            message: 'Permission created successfully',
            data: { permission }
        });

    } catch (error) {
        console.error('Create permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to create permission' });
    }
};

// Get all permissions
exports.getAllPermissions = async (req, res) => {
    try {
        const filters = {
            projectId: req.query.projectId,
            status: req.query.status,
            assignedToUserId: req.query.assignedToUserId,
            permissionType: req.query.permissionType,
            dueDateFrom: req.query.dueDateFrom,
            dueDateTo: req.query.dueDateTo,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const permissions = await ProjectGroundPermission.findAll(filters);

        res.json({
            success: true,
            data: {
                permissions,
                count: permissions.length
            }
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
};

// Get permissions by project
exports.getPermissionsByProject = async (req, res) => {
    try {
        const permissions = await ProjectGroundPermission.findByProjectId(req.params.projectId, {
            status: req.query.status
        });

        res.json({
            success: true,
            data: {
                permissions,
                count: permissions.length
            }
        });
    } catch (error) {
        console.error('Get project permissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
};

// Get permission by ID
exports.getPermissionById = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);

        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        // Get related data
        const documents = await ProjectGroundPermission.getDocuments(req.params.id);
        const comments = await ProjectGroundPermission.getComments(req.params.id);
        const assignedUsers = await ProjectGroundPermission.getAssignedUsers(req.params.id);

        res.json({
            success: true,
            data: {
                permission,
                documents,
                comments,
                assignedUsers
            }
        });
    } catch (error) {
        console.error('Get permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permission' });
    }
};

// Update permission
exports.updatePermission = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        const updated = await ProjectGroundPermission.update(req.params.id, req.body, req.user.UserId);

        if (!updated) {
            return res.status(400).json({ success: false, message: 'No changes made' });
        }

        const updatedPermission = await ProjectGroundPermission.findById(req.params.id);

        res.json({
            success: true,
            message: 'Permission updated successfully',
            data: { permission: updatedPermission }
        });
    } catch (error) {
        console.error('Update permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to update permission' });
    }
};

// Submit permission
exports.submitPermission = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        if (permission.Status !== 'Pending' && permission.Status !== 'InProgress') {
            return res.status(400).json({
                success: false,
                message: 'Permission has already been submitted or processed'
            });
        }

        await ProjectGroundPermission.submit(req.params.id, req.user.UserId);

        const updatedPermission = await ProjectGroundPermission.findById(req.params.id);

        res.json({
            success: true,
            message: 'Permission submitted successfully',
            data: { permission: updatedPermission }
        });
    } catch (error) {
        console.error('Submit permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit permission' });
    }
};

// Approve permission
exports.approvePermission = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        if (permission.Status !== 'Submitted') {
            return res.status(400).json({
                success: false,
                message: 'Permission must be submitted before approval'
            });
        }

        await ProjectGroundPermission.approve(req.params.id, req.user.UserId);

        const updatedPermission = await ProjectGroundPermission.findById(req.params.id);

        res.json({
            success: true,
            message: 'Permission approved successfully',
            data: { permission: updatedPermission }
        });
    } catch (error) {
        console.error('Approve permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve permission' });
    }
};

// Reject permission
exports.rejectPermission = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        if (permission.Status !== 'Submitted') {
            return res.status(400).json({
                success: false,
                message: 'Permission must be submitted before rejection'
            });
        }

        await ProjectGroundPermission.reject(req.params.id, req.user.UserId);

        const updatedPermission = await ProjectGroundPermission.findById(req.params.id);

        res.json({
            success: true,
            message: 'Permission rejected',
            data: { permission: updatedPermission }
        });
    } catch (error) {
        console.error('Reject permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject permission' });
    }
};

// Delete permission
exports.deletePermission = async (req, res) => {
    try {
        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        await ProjectGroundPermission.delete(req.params.id, req.user.UserId);

        res.json({
            success: true,
            message: 'Permission deleted successfully'
        });
    } catch (error) {
        console.error('Delete permission error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete permission' });
    }
};

// ==================== Documents ====================

// Upload document
exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        const fileUrl = req.file.path; // Azure Blob URL set by azureUploadSingle middleware

        const documentId = await ProjectGroundPermission.addDocument({
            projectPermissionId: req.params.id,
            fileName: req.file.originalname,
            fileUrl,
            filePath: fileUrl,
            documentType: req.body.documentType || 'General',
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.UserId
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: { documentId, fileUrl }
        });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
};

// Get documents
exports.getDocuments = async (req, res) => {
    try {
        const documents = await ProjectGroundPermission.getDocuments(req.params.id);

        res.json({
            success: true,
            data: { documents }
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};

// Delete document
exports.deleteDocument = async (req, res) => {
    try {
        await ProjectGroundPermission.deleteDocument(req.params.documentId);

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};

// ==================== Comments ====================

// Add comment
exports.addComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        const commentId = await ProjectGroundPermission.addComment({
            projectPermissionId: req.params.id,
            commentText: req.body.commentText,
            commentedByUserId: req.user.UserId,
            commentedByRole: req.user.RoleCode || req.user.roleCode || req.user.role,
            parentCommentId: req.body.parentCommentId
        });

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: { commentId }
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

// Get comments
exports.getComments = async (req, res) => {
    try {
        const comments = await ProjectGroundPermission.getComments(req.params.id);

        res.json({
            success: true,
            data: { comments }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments' });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        await ProjectGroundPermission.deleteComment(req.params.commentId, req.user.UserId);

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete comment' });
    }
};

// ==================== Assignments ====================

// Assign user
exports.assignUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const permission = await ProjectGroundPermission.findById(req.params.id);
        if (!permission) {
            return res.status(404).json({ success: false, message: 'Permission not found' });
        }

        await ProjectGroundPermission.assignUser({
            userId: req.body.userId,
            projectPermissionId: req.params.id,
            projectId: permission.ProjectId,
            assignedBy: req.user.UserId
        });

        const assignedUsers = await ProjectGroundPermission.getAssignedUsers(req.params.id);

        res.status(201).json({
            success: true,
            message: 'User assigned successfully',
            data: { assignedUsers }
        });
    } catch (error) {
        console.error('Assign user error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign user' });
    }
};

// Get assigned users
exports.getAssignedUsers = async (req, res) => {
    try {
        const assignedUsers = await ProjectGroundPermission.getAssignedUsers(req.params.id);

        res.json({
            success: true,
            data: { assignedUsers }
        });
    } catch (error) {
        console.error('Get assigned users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assigned users' });
    }
};

// Unassign user
exports.unassignUser = async (req, res) => {
    try {
        await ProjectGroundPermission.unassignUser(req.params.userId, req.params.id);

        res.json({
            success: true,
            message: 'User unassigned successfully'
        });
    } catch (error) {
        console.error('Unassign user error:', error);
        res.status(500).json({ success: false, message: 'Failed to unassign user' });
    }
};

// Get my assigned permissions
exports.getMyPermissions = async (req, res) => {
    try {
        const permissions = await ProjectGroundPermission.getPermissionsByUser(req.user.UserId);

        res.json({
            success: true,
            data: {
                permissions,
                count: permissions.length
            }
        });
    } catch (error) {
        console.error('Get my permissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
    }
};
