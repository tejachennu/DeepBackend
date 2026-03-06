const db = require('../config/database');

class ProjectSponsor {
    // Create sponsor
    static async create(data) {
        const {
            projectId, sponsorType, sponsorId, organizationId,
            sponsorName, sponsorEmail, sponsorPhone, sponsorAddress, sponsorWebsite, sponsorLogo,
            purpose, sponsorshipType, amount, currency, description,
            startDate, endDate, status, isPublic, displayOrder, createdBy
        } = data;

        const [result] = await db.execute(
            `INSERT INTO project_sponsors (
                ProjectId, SponsorType, SponsorId, OrganizationId,
                SponsorName, SponsorEmail, SponsorPhone, SponsorAddress, SponsorWebsite, SponsorLogo,
                Purpose, SponsorshipType, Amount, Currency, Description,
                StartDate, EndDate, Status, IsPublic, DisplayOrder, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectId, sponsorType || 'INDIVIDUAL', sponsorId, organizationId,
                sponsorName, sponsorEmail, sponsorPhone, sponsorAddress, sponsorWebsite, sponsorLogo,
                purpose, sponsorshipType || 'FINANCIAL', amount || 0, currency || 'INR', description,
                startDate, endDate, status || 'Active', isPublic !== false, displayOrder || 0, createdBy
            ]
        );
        return result.insertId;
    }

    // Find by ID
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT ps.*,
                    p.ProjectName,
                    u.FullName as SponsorUserName,
                    o.OrganizationName,
                    cu.FullName as CreatedByName,
                    (SELECT COUNT(*) FROM project_sponsor_media WHERE ProjectSponsorId = ps.ProjectSponsorId AND IsDeleted = FALSE) as MediaCount
             FROM project_sponsors ps
             LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
             LEFT JOIN users u ON ps.SponsorId = u.UserId
             LEFT JOIN organizations o ON ps.OrganizationId = o.OrganizationId
             LEFT JOIN users cu ON ps.CreatedBy = cu.UserId
             WHERE ps.ProjectSponsorId = ? AND ps.IsDeleted = FALSE`,
            [id]
        );
        return rows[0];
    }

    // Find all with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT ps.*,
                   p.ProjectName,
                   u.FullName as SponsorUserName,
                   o.OrganizationName,
                   (SELECT COUNT(*) FROM project_sponsor_media WHERE ProjectSponsorId = ps.ProjectSponsorId AND MediaType = 'IMAGE' AND IsDeleted = FALSE) as ImageCount,
                   (SELECT COUNT(*) FROM project_sponsor_media WHERE ProjectSponsorId = ps.ProjectSponsorId AND MediaType = 'VIDEO' AND IsDeleted = FALSE) as VideoCount
            FROM project_sponsors ps
            LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
            LEFT JOIN users u ON ps.SponsorId = u.UserId
            LEFT JOIN organizations o ON ps.OrganizationId = o.OrganizationId
            WHERE ps.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) { query += ' AND ps.ProjectId = ?'; params.push(filters.projectId); }
        if (filters.sponsorType) { query += ' AND ps.SponsorType = ?'; params.push(filters.sponsorType); }
        if (filters.sponsorshipType) { query += ' AND ps.SponsorshipType = ?'; params.push(filters.sponsorshipType); }
        if (filters.status) { query += ' AND ps.Status = ?'; params.push(filters.status); }
        if (filters.isPublic !== undefined) { query += ' AND ps.IsPublic = ?'; params.push(filters.isPublic); }
        if (filters.search) {
            query += ' AND (ps.SponsorName LIKE ? OR ps.Purpose LIKE ? OR ps.Description LIKE ?)';
            const s = `%${filters.search}%`;
            params.push(s, s, s);
        }

        query += ' ORDER BY ps.DisplayOrder ASC, ps.CreatedDate DESC';
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) { query += ' OFFSET ?'; params.push(parseInt(filters.offset)); }
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Get public sponsors for a project
    static async getPublicSponsors(projectId) {
        return this.findAll({ projectId, isPublic: true, status: 'Active' });
    }

    // Update
    static async update(id, data, updatedBy) {
        const allowedFields = [
            'SponsorType', 'SponsorId', 'OrganizationId',
            'SponsorName', 'SponsorEmail', 'SponsorPhone', 'SponsorAddress', 'SponsorWebsite', 'SponsorLogo',
            'Purpose', 'SponsorshipType', 'Amount', 'Currency', 'Description',
            'StartDate', 'EndDate', 'Status', 'IsPublic', 'DisplayOrder'
        ];
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

        updates.push('UpdatedBy = ?');
        params.push(updatedBy, id);

        const [result] = await db.execute(
            `UPDATE project_sponsors SET ${updates.join(', ')} WHERE ProjectSponsorId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Delete (soft)
    static async delete(id, deletedBy) {
        const [result] = await db.execute(
            `UPDATE project_sponsors SET IsDeleted = TRUE, UpdatedBy = ? WHERE ProjectSponsorId = ?`,
            [deletedBy, id]
        );
        return result.affectedRows > 0;
    }

    // ==================== Media Operations ====================
    static async addMedia(data) {
        const { projectSponsorId, mediaType, mediaUrl, thumbnailUrl, fileName, fileSize, mimeType, caption, displayOrder, uploadedBy } = data;
        const [result] = await db.execute(
            `INSERT INTO project_sponsor_media (ProjectSponsorId, MediaType, MediaUrl, ThumbnailUrl, FileName, FileSize, MimeType, Caption, DisplayOrder, UploadedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectSponsorId, mediaType, mediaUrl, thumbnailUrl, fileName, fileSize, mimeType, caption, displayOrder || 0, uploadedBy]
        );
        return result.insertId;
    }

    static async getMedia(id, mediaType = null) {
        let query = `SELECT * FROM project_sponsor_media WHERE ProjectSponsorId = ? AND IsDeleted = FALSE`;
        const params = [id];
        if (mediaType) { query += ' AND MediaType = ?'; params.push(mediaType); }
        query += ' ORDER BY DisplayOrder ASC, UploadedDate DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async deleteMedia(mediaId) {
        const [result] = await db.execute(`UPDATE project_sponsor_media SET IsDeleted = TRUE WHERE MediaId = ?`, [mediaId]);
        return result.affectedRows > 0;
    }

    // Get summary by project
    static async getSummary(projectId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as totalSponsors,
                COALESCE(SUM(Amount), 0) as totalAmount,
                SUM(CASE WHEN SponsorType = 'INDIVIDUAL' THEN 1 ELSE 0 END) as individualCount,
                SUM(CASE WHEN SponsorType = 'ORGANIZATION' THEN 1 ELSE 0 END) as organizationCount,
                SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END) as activeCount
             FROM project_sponsors WHERE ProjectId = ? AND IsDeleted = FALSE`,
            [projectId]
        );
        return rows[0];
    }
}

module.exports = ProjectSponsor;
