const db = require('../config/database');

class ProjectGroundPermission {
    // Create a new permission
    static async create(permissionData) {
        const {
            projectId, permissionType, description, assignedToUserId,
            dueDate, createdBy
        } = permissionData;

        const formattedDueDate = dueDate ? new Date(dueDate).toISOString().slice(0, 19).replace('T', ' ') : null;

        const [result] = await db.execute(
            `INSERT INTO project_ground_permissions (
                ProjectId, PermissionType, Description, AssignedToUserId,
                DueDate, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                projectId,
                permissionType,
                description || null,
                assignedToUserId || null,
                formattedDueDate,
                createdBy
            ]
        );
        return result.insertId;
    }

    // Find permission by ID
    static async findById(permissionId) {
        const [rows] = await db.execute(
            `SELECT pgp.*,
                    p.ProjectName,
                    u.FullName as AssignedToName,
                    u2.FullName as CreatedByName,
                    u3.FullName as ApprovedRejectedByName
             FROM project_ground_permissions pgp
             LEFT JOIN projects p ON pgp.ProjectId = p.ProjectId
             LEFT JOIN users u ON pgp.AssignedToUserId = u.UserId
             LEFT JOIN users u2 ON pgp.CreatedBy = u2.UserId
             LEFT JOIN users u3 ON pgp.ApprovedRejectedBy = u3.UserId
             WHERE pgp.ProjectPermissionId = ? AND pgp.IsDeleted = FALSE`,
            [permissionId]
        );
        return rows[0];
    }

    // Find all permissions with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT pgp.*,
                   p.ProjectName,
                   u.FullName as AssignedToName,
                   u2.FullName as CreatedByName,
                   u3.FullName as ApprovedRejectedByName,
                   (SELECT COUNT(*) FROM project_permission_documents WHERE ProjectPermissionId = pgp.ProjectPermissionId AND IsDeleted = FALSE) as DocumentCount,
                   (SELECT COUNT(*) FROM project_permission_comments WHERE ProjectPermissionId = pgp.ProjectPermissionId AND IsDeleted = FALSE) as CommentCount
            FROM project_ground_permissions pgp
            LEFT JOIN projects p ON pgp.ProjectId = p.ProjectId
            LEFT JOIN users u ON pgp.AssignedToUserId = u.UserId
            LEFT JOIN users u2 ON pgp.CreatedBy = u2.UserId
            LEFT JOIN users u3 ON pgp.ApprovedRejectedBy = u3.UserId
            WHERE pgp.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) {
            query += ' AND pgp.ProjectId = ?';
            params.push(filters.projectId);
        }

        if (filters.status) {
            query += ' AND pgp.Status = ?';
            params.push(filters.status);
        }

        if (filters.assignedToUserId) {
            query += ' AND pgp.AssignedToUserId = ?';
            params.push(filters.assignedToUserId);
        }

        if (filters.permissionType) {
            query += ' AND pgp.PermissionType LIKE ?';
            params.push(`%${filters.permissionType}%`);
        }

        if (filters.dueDateFrom) {
            query += ' AND pgp.DueDate >= ?';
            params.push(filters.dueDateFrom);
        }

        if (filters.dueDateTo) {
            query += ' AND pgp.DueDate <= ?';
            params.push(filters.dueDateTo);
        }

        query += ' ORDER BY pgp.CreatedDate DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filters.offset));
            }
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Find by project
    static async findByProjectId(projectId, filters = {}) {
        return this.findAll({ ...filters, projectId });
    }

    // Update permission
    static async update(permissionId, updateData, updatedBy) {
        const allowedFields = [
            'PermissionType', 'Description', 'AssignedToUserId', 'DueDate', 'Status'
        ];

        const updates = [];
        const params = [];

        for (const [key, value] of Object.entries(updateData)) {
            const dbField = key.charAt(0).toUpperCase() + key.slice(1);
            if (allowedFields.includes(dbField) && value !== undefined) {
                updates.push(`${dbField} = ?`);
                params.push(value);
            }
        }

        if (updates.length === 0) return false;

        updates.push('UpdatedBy = ?');
        params.push(updatedBy);
        params.push(permissionId);

        const [result] = await db.execute(
            `UPDATE project_ground_permissions SET ${updates.join(', ')} WHERE ProjectPermissionId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Submit permission
    static async submit(permissionId, submittedBy) {
        const [result] = await db.execute(
            `UPDATE project_ground_permissions 
             SET Status = 'Submitted', SubmittedDate = NOW(), UpdatedBy = ?
             WHERE ProjectPermissionId = ? AND IsDeleted = FALSE`,
            [submittedBy, permissionId]
        );
        return result.affectedRows > 0;
    }

    // Approve permission
    static async approve(permissionId, approvedBy) {
        const [result] = await db.execute(
            `UPDATE project_ground_permissions 
             SET Status = 'Approved', ApprovedRejectedDate = NOW(), ApprovedRejectedBy = ?, UpdatedBy = ?
             WHERE ProjectPermissionId = ? AND IsDeleted = FALSE`,
            [approvedBy, approvedBy, permissionId]
        );
        return result.affectedRows > 0;
    }

    // Reject permission
    static async reject(permissionId, rejectedBy) {
        const [result] = await db.execute(
            `UPDATE project_ground_permissions 
             SET Status = 'Rejected', ApprovedRejectedDate = NOW(), ApprovedRejectedBy = ?, UpdatedBy = ?
             WHERE ProjectPermissionId = ? AND IsDeleted = FALSE`,
            [rejectedBy, rejectedBy, permissionId]
        );
        return result.affectedRows > 0;
    }

    // Soft delete
    static async delete(permissionId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE project_ground_permissions SET IsDeleted = TRUE, UpdatedBy = ? WHERE ProjectPermissionId = ?`,
            [deletedBy, permissionId]
        );
        return result.affectedRows > 0;
    }

    // ==================== Documents ====================

    // Add document
    static async addDocument(documentData) {
        const { projectPermissionId, fileName, fileUrl, filePath, documentType, fileSize, mimeType, uploadedBy } = documentData;

        const [result] = await db.execute(
            `INSERT INTO project_permission_documents (
                ProjectPermissionId, FileName, FileUrl, FilePath, DocumentType, FileSize, MimeType, UploadedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectPermissionId, fileName, fileUrl, filePath, documentType, fileSize, mimeType, uploadedBy]
        );
        return result.insertId;
    }

    // Get documents by permission
    static async getDocuments(permissionId) {
        const [rows] = await db.execute(
            `SELECT d.*, u.FullName as UploadedByName
             FROM project_permission_documents d
             LEFT JOIN users u ON d.UploadedBy = u.UserId
             WHERE d.ProjectPermissionId = ? AND d.IsDeleted = FALSE
             ORDER BY d.UploadedDate DESC`,
            [permissionId]
        );
        return rows;
    }

    // Delete document
    static async deleteDocument(documentId) {
        const [result] = await db.execute(
            `UPDATE project_permission_documents SET IsDeleted = TRUE WHERE DocumentId = ?`,
            [documentId]
        );
        return result.affectedRows > 0;
    }

    // ==================== Comments ====================

    // Add comment
    static async addComment(commentData) {
        const { projectPermissionId, commentText, commentedByUserId, commentedByRole, parentCommentId } = commentData;

        const [result] = await db.execute(
            `INSERT INTO project_permission_comments (
                ProjectPermissionId, CommentText, CommentedByUserId, CommentedByRole, ParentCommentId
            ) VALUES (?, ?, ?, ?, ?)`,
            [projectPermissionId, commentText, commentedByUserId || null, commentedByRole || null, parentCommentId || null]
        );
        return result.insertId;
    }

    // Get comments by permission (with replies)
    static async getComments(permissionId) {
        const [rows] = await db.execute(
            `SELECT c.*, u.FullName as CommentedByName
             FROM project_permission_comments c
             LEFT JOIN users u ON c.CommentedByUserId = u.UserId
             WHERE c.ProjectPermissionId = ? AND c.IsDeleted = FALSE
             ORDER BY c.CreatedDate ASC`,
            [permissionId]
        );

        // Build nested structure
        const commentMap = new Map();
        const rootComments = [];

        rows.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.CommentId, comment);
        });

        rows.forEach(comment => {
            if (comment.ParentCommentId) {
                const parent = commentMap.get(comment.ParentCommentId);
                if (parent) parent.replies.push(comment);
            } else {
                rootComments.push(comment);
            }
        });

        return rootComments;
    }

    // Delete comment
    static async deleteComment(commentId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE project_permission_comments SET IsDeleted = TRUE WHERE CommentId = ?`,
            [commentId]
        );
        return result.affectedRows > 0;
    }

    // ==================== Assignments ====================

    // Assign user to permission
    static async assignUser(assignmentData) {
        const { userId, projectPermissionId, projectId, assignedBy } = assignmentData;

        const [result] = await db.execute(
            `INSERT INTO assigned_project_permissions (
                UserId, ProjectPermissionId, ProjectId, AssignedBy
            ) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE IsActive = TRUE, AssignedBy = ?, AssignedDate = NOW()`,
            [userId, projectPermissionId, projectId, assignedBy, assignedBy]
        );
        return result.insertId || result.affectedRows > 0;
    }

    // Get assigned users for a permission
    static async getAssignedUsers(permissionId) {
        const [rows] = await db.execute(
            `SELECT app.*, u.FullName as UserName, u.Email,
                    u2.FullName as AssignedByName
             FROM assigned_project_permissions app
             LEFT JOIN users u ON app.UserId = u.UserId
             LEFT JOIN users u2 ON app.AssignedBy = u2.UserId
             WHERE app.ProjectPermissionId = ? AND app.IsActive = TRUE`,
            [permissionId]
        );
        return rows;
    }

    // Remove assignment
    static async unassignUser(userId, permissionId) {
        const [result] = await db.execute(
            `UPDATE assigned_project_permissions SET IsActive = FALSE WHERE UserId = ? AND ProjectPermissionId = ?`,
            [userId, permissionId]
        );
        return result.affectedRows > 0;
    }

    // Get permissions assigned to a user
    static async getPermissionsByUser(userId) {
        const [rows] = await db.execute(
            `SELECT pgp.*, p.ProjectName,
                    u.FullName as AssignedToName,
                    u2.FullName as CreatedByName,
                    u3.FullName as ApprovedRejectedByName
             FROM project_ground_permissions pgp
             JOIN projects p ON pgp.ProjectId = p.ProjectId
             LEFT JOIN assigned_project_permissions app ON pgp.ProjectPermissionId = app.ProjectPermissionId AND app.IsActive = TRUE
             LEFT JOIN users u ON pgp.AssignedToUserId = u.UserId
             LEFT JOIN users u2 ON pgp.CreatedBy = u2.UserId
             LEFT JOIN users u3 ON pgp.ApprovedRejectedBy = u3.UserId
             WHERE (app.UserId = ? OR pgp.AssignedToUserId = ?) AND pgp.IsDeleted = FALSE
             GROUP BY pgp.ProjectPermissionId
             ORDER BY pgp.CreatedDate DESC`,
            [userId, userId]
        );
        return rows;
    }
}

module.exports = ProjectGroundPermission;
