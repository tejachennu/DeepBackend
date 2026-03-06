const db = require('../config/database');

class VolunteerApplication {
    static async apply(data) {
        const [result] = await db.execute(
            `INSERT INTO volunteer_applications 
             (ProjectId, UserId, Message, Skills, Availability, PreviousExperience)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                data.projectId,
                data.userId,
                data.message || null,
                data.skills || null,
                data.availability || null,
                data.previousExperience || null
            ]
        );

        // Save custom field responses
        if (data.responses && data.responses.length > 0) {
            for (const resp of data.responses) {
                await db.execute(
                    `INSERT INTO volunteer_application_responses (ApplicationId, FieldId, ResponseValue)
                     VALUES (?, ?, ?)`,
                    [result.insertId, resp.fieldId, resp.value || '']
                );
            }
        }

        return result.insertId;
    }

    static async checkDuplicate(projectId, userId) {
        const [rows] = await db.execute(
            `SELECT ApplicationId, Status FROM volunteer_applications 
             WHERE ProjectId = ? AND UserId = ? AND IsDeleted = FALSE`,
            [projectId, userId]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    static async findByProject(projectId, filters = {}) {
        let query = `
            SELECT va.*, u.FullName AS UserName, u.Email AS UserEmail, u.MobileNumber AS UserPhone,
                   r.FullName AS ReviewerName
            FROM volunteer_applications va
            JOIN users u ON va.UserId = u.UserId
            LEFT JOIN users r ON va.ReviewedBy = r.UserId
            WHERE va.ProjectId = ? AND va.IsDeleted = FALSE
        `;
        const params = [projectId];

        if (filters.status) {
            query += ' AND va.Status = ?';
            params.push(filters.status);
        }

        query += ' ORDER BY va.CreatedDate DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }
        if (filters.offset) {
            query += ' OFFSET ?';
            params.push(parseInt(filters.offset));
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async findByUser(userId) {
        const [rows] = await db.execute(
            `SELECT va.*, p.ProjectName, p.ProjectTitle, p.BannerUrl
             FROM volunteer_applications va
             JOIN projects p ON va.ProjectId = p.ProjectId
             WHERE va.UserId = ? AND va.IsDeleted = FALSE
             ORDER BY va.CreatedDate DESC`,
            [userId]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT va.*, u.FullName AS UserName, u.Email AS UserEmail, u.MobileNumber AS UserPhone,
                    p.ProjectName, r.FullName AS ReviewerName
             FROM volunteer_applications va
             JOIN users u ON va.UserId = u.UserId
             JOIN projects p ON va.ProjectId = p.ProjectId
             LEFT JOIN users r ON va.ReviewedBy = r.UserId
             WHERE va.ApplicationId = ? AND va.IsDeleted = FALSE`,
            [id]
        );
        if (rows.length === 0) return null;

        // Get custom field responses
        const [responses] = await db.execute(
            `SELECT var.*, vff.FieldName, vff.FieldLabel, vff.FieldType
             FROM volunteer_application_responses var
             JOIN volunteer_form_fields vff ON var.FieldId = vff.FieldId
             WHERE var.ApplicationId = ?
             ORDER BY vff.DisplayOrder ASC`,
            [id]
        );

        return { ...rows[0], responses };
    }

    static async accept(id, reviewedBy, adminNotes) {
        const [result] = await db.execute(
            `UPDATE volunteer_applications 
             SET Status = 'Accepted', ReviewedBy = ?, ReviewedDate = NOW(), AdminNotes = ?
             WHERE ApplicationId = ? AND IsDeleted = FALSE`,
            [reviewedBy, adminNotes || null, id]
        );
        return result.affectedRows > 0;
    }

    static async reject(id, reviewedBy, adminNotes) {
        const [result] = await db.execute(
            `UPDATE volunteer_applications 
             SET Status = 'Rejected', ReviewedBy = ?, ReviewedDate = NOW(), AdminNotes = ?
             WHERE ApplicationId = ? AND IsDeleted = FALSE`,
            [reviewedBy, adminNotes || null, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.execute(
            `UPDATE volunteer_applications SET IsDeleted = TRUE WHERE ApplicationId = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    static async update(id, data, updatedBy) {
        const allowedFields = ['Message', 'Skills', 'Availability', 'PreviousExperience'];
        const updates = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            const dbField = key.charAt(0).toUpperCase() + key.slice(1);
            if (allowedFields.includes(dbField) && value !== undefined) {
                updates.push(`${dbField} = ?`);
                params.push(value);
            }
        }
        if (updates.length === 0) return false;

        params.push(id);
        const [result] = await db.execute(
            `UPDATE volunteer_applications SET ${updates.join(', ')} WHERE ApplicationId = ?`,
            params
        );
        return result.affectedRows > 0;
    }

    static async getCountByProject(projectId) {
        const [rows] = await db.execute(
            `SELECT Status, COUNT(*) as count FROM volunteer_applications
             WHERE ProjectId = ? AND IsDeleted = FALSE
             GROUP BY Status`,
            [projectId]
        );
        return rows;
    }
}

module.exports = VolunteerApplication;
