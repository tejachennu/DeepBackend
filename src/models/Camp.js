const db = require('../config/database');

class Camp {
    // Create a new camp
    static async create(campData) {
        const projectId = campData.ProjectId || campData.projectId;
        const campName = campData.CampName || campData.campName;
        const campDescription = campData.CampDescription || campData.campDescription;
        const campType = campData.CampType || campData.campType;
        const campAddress = campData.CampAddress || campData.campAddress;
        const campPincode = campData.CampPincode || campData.campPincode;
        const campState = campData.CampState || campData.campState;
        const campCity = campData.CampCity || campData.campCity;
        const peopleExpected = campData.PeopleExpected || campData.peopleExpected;
        const registrationFormLink = campData.RegistrationFormLink || campData.registrationFormLink;
        const excelDataLink = campData.ExcelDataLink || campData.excelDataLink;
        const campStartDate = campData.CampStartDate || campData.campStartDate;
        const campEndDate = campData.CampEndDate || campData.campEndDate;
        const latitude = campData.Latitude || campData.latitude;
        const longitude = campData.Longitude || campData.longitude;
        const bannerUrl = campData.BannerUrl || campData.bannerUrl;
        const createdBy = campData.createdBy || campData.CreatedBy;

        const [result] = await db.execute(
            `INSERT INTO camps (
                ProjectId, CampName, CampDescription, CampType, CampAddress,
                CampPincode, CampState, CampCity, PeopleExpected,
                RegistrationFormLink, ExcelDataLink, CampStartDate, CampEndDate,
                Latitude, Longitude, BannerUrl, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectId, campName, campDescription, campType, campAddress,
                campPincode, campState, campCity, peopleExpected || 0,
                registrationFormLink, excelDataLink, campStartDate, campEndDate,
                latitude, longitude, bannerUrl, createdBy
            ]
        );
        return result.insertId;
    }

    // Find camp by ID
    static async findById(campId) {
        const [rows] = await db.execute(
            `SELECT c.*,
                    p.ProjectName,
                    u.FullName as CreatedByName,
                    (SELECT COUNT(*) FROM camp_media WHERE CampId = c.CampId AND IsDeleted = FALSE) as MediaCount
             FROM camps c
             LEFT JOIN projects p ON c.ProjectId = p.ProjectId
             LEFT JOIN users u ON c.CreatedBy = u.UserId
             WHERE c.CampId = ? AND c.IsDeleted = FALSE`,
            [campId]
        );
        return rows[0];
    }

    // Find all camps with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT c.*,
                   p.ProjectName,
                   (SELECT COUNT(*) FROM camp_media WHERE CampId = c.CampId AND MediaType = 'IMAGE' AND IsDeleted = FALSE) as ImageCount,
                   (SELECT COUNT(*) FROM camp_media WHERE CampId = c.CampId AND MediaType = 'VIDEO' AND IsDeleted = FALSE) as VideoCount
            FROM camps c
            LEFT JOIN projects p ON c.ProjectId = p.ProjectId
            WHERE c.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) {
            query += ' AND c.ProjectId = ?';
            params.push(filters.projectId);
        }

        if (filters.campStatus) {
            query += ' AND c.CampStatus = ?';
            params.push(filters.campStatus);
        }

        if (filters.campType) {
            query += ' AND c.CampType = ?';
            params.push(filters.campType);
        }

        if (filters.campState) {
            query += ' AND c.CampState = ?';
            params.push(filters.campState);
        }

        if (filters.dateFrom) {
            query += ' AND c.CampStartDate >= ?';
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            query += ' AND c.CampEndDate <= ?';
            params.push(filters.dateTo);
        }

        if (filters.search) {
            query += ' AND (c.CampName LIKE ? OR c.CampDescription LIKE ? OR c.CampAddress LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY c.CampStartDate DESC';

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

    // Update camp
    static async update(campId, updateData, updatedBy) {
        const allowedFields = [
            'CampName', 'CampDescription', 'CampType', 'CampAddress',
            'CampPincode', 'CampState', 'CampCity', 'PeopleExpected', 'PeopleAttended',
            'RegistrationFormLink', 'ExcelDataLink', 'CampStartDate', 'CampEndDate',
            'CampStatus', 'Latitude', 'Longitude', 'BannerUrl'
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
        params.push(campId);

        const [result] = await db.execute(
            `UPDATE camps SET ${updates.join(', ')} WHERE CampId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Update attendance
    static async updateAttendance(campId, peopleAttended, updatedBy) {
        const [result] = await db.execute(
            `UPDATE camps SET PeopleAttended = ?, UpdatedBy = ? WHERE CampId = ? AND IsDeleted = FALSE`,
            [peopleAttended, updatedBy, campId]
        );
        return result.affectedRows > 0;
    }

    // Soft delete
    static async delete(campId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE camps SET IsDeleted = TRUE, UpdatedBy = ? WHERE CampId = ?`,
            [deletedBy, campId]
        );
        return result.affectedRows > 0;
    }

    // ==================== Media Operations ====================

    // Add media
    static async addMedia(mediaData) {
        const {
            campId, mediaType, mediaUrl, thumbnailUrl, fileName,
            fileSize, mimeType, caption, displayOrder, uploadedBy
        } = mediaData;

        const [result] = await db.execute(
            `INSERT INTO camp_media (
                CampId, MediaType, MediaUrl, ThumbnailUrl, FileName,
                FileSize, MimeType, Caption, DisplayOrder, UploadedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                campId, mediaType, mediaUrl, thumbnailUrl, fileName,
                fileSize, mimeType, caption, displayOrder || 0, uploadedBy
            ]
        );
        return result.insertId;
    }

    // Get all media for a camp
    static async getMedia(campId, mediaType = null, userId = null, limit = 50, offset = 0) {
        let query = `
            SELECT m.*, u.FullName as UploadedByName,
                   (SELECT COUNT(*) FROM camp_media_likes l WHERE l.MediaId = m.MediaId) as LikeCount,
                   ${userId ? 'EXISTS(SELECT 1 FROM camp_media_likes l WHERE l.MediaId = m.MediaId AND l.UserId = ?)' : '0'} as IsLiked,
                   (SELECT COUNT(*) FROM camp_media_comments cmt WHERE cmt.MediaId = m.MediaId AND cmt.IsDeleted = FALSE) as CommentCount
            FROM camp_media m
            LEFT JOIN users u ON m.UploadedBy = u.UserId
            WHERE m.CampId = ? AND m.IsDeleted = FALSE
        `;
        const params = [];
        if (userId) params.push(userId);
        params.push(campId);

        if (mediaType) {
            query += ' AND m.MediaType = ?';
            params.push(mediaType.toUpperCase());
        }

        query += ' ORDER BY m.DisplayOrder ASC, m.UploadedDate DESC';
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.execute(query, params);
        return rows.map(row => ({
            ...row,
            IsLiked: Boolean(row.IsLiked)
        }));
    }

    // Get images only
    static async getImages(campId, userId = null, limit = 50, offset = 0) {
        return this.getMedia(campId, 'IMAGE', userId, limit, offset);
    }

    // Get videos only
    static async getVideos(campId, userId = null, limit = 50, offset = 0) {
        return this.getMedia(campId, 'VIDEO', userId, limit, offset);
    }

    // Update media
    static async updateMedia(mediaId, updateData) {
        const { caption, displayOrder } = updateData;
        const updates = [];
        const params = [];

        if (caption !== undefined) {
            updates.push('Caption = ?');
            params.push(caption);
        }
        if (displayOrder !== undefined) {
            updates.push('DisplayOrder = ?');
            params.push(displayOrder);
        }

        if (updates.length === 0) return false;

        params.push(mediaId);

        const [result] = await db.execute(
            `UPDATE camp_media SET ${updates.join(', ')} WHERE MediaId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Delete media
    static async deleteMedia(mediaId) {
        const [result] = await db.execute(
            `UPDATE camp_media SET IsDeleted = TRUE WHERE MediaId = ?`,
            [mediaId]
        );
        return result.affectedRows > 0;
    }

    // Get camp statistics for a project
    static async getProjectStats(projectId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as totalCamps,
                SUM(CASE WHEN CampStatus = 'Completed' THEN 1 ELSE 0 END) as completedCamps,
                SUM(CASE WHEN CampStatus = 'Ongoing' THEN 1 ELSE 0 END) as ongoingCamps,
                SUM(CASE WHEN CampStatus = 'Planned' THEN 1 ELSE 0 END) as plannedCamps,
                COALESCE(SUM(PeopleExpected), 0) as totalExpected,
                COALESCE(SUM(PeopleAttended), 0) as totalAttended
             FROM camps
             WHERE ProjectId = ? AND IsDeleted = FALSE`,
            [projectId]
        );
        return rows[0];
    }
}

module.exports = Camp;
