const db = require('../config/database');

class Project {
    // Create a new project
    static async create(projectData) {
        const projectName = projectData.ProjectName || projectData.projectName;
        const projectTitle = projectData.ProjectTitle || projectData.projectTitle;
        const projectDescription = projectData.ProjectDescription || projectData.projectDescription;
        const objective = projectData.Objective || projectData.objective;
        const bannerUrl = projectData.BannerUrl || projectData.bannerUrl;
        const startDate = projectData.StartDate || projectData.startDate;
        const startTime = projectData.StartTime || projectData.startTime;
        const endDate = projectData.EndDate || projectData.endDate;
        const endTime = projectData.EndTime || projectData.endTime;
        const location = projectData.Location || projectData.location;
        const latitude = projectData.Latitude || projectData.latitude;
        const longitude = projectData.Longitude || projectData.longitude;
        const volunteerTitle = projectData.VolunteerTitle || projectData.volunteerTitle;
        const volunteerDescription = projectData.VolunteerDescription || projectData.volunteerDescription;
        const status = projectData.Status || projectData.status;
        const createdBy = projectData.createdBy || projectData.CreatedBy;

        const [result] = await db.execute(
            `INSERT INTO projects (
                ProjectName, ProjectTitle, ProjectDescription, Objective,
                BannerUrl, StartDate, StartTime, EndDate, EndTime,
                Location, Latitude, Longitude, VolunteerTitle, VolunteerDescription, Status, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectName, projectTitle, projectDescription, objective,
                bannerUrl, startDate, startTime, endDate, endTime,
                location, latitude, longitude, volunteerTitle || null, volunteerDescription || null, status || 'Planned', createdBy
            ]
        );
        return result.insertId;
    }

    // Find project by ID
    static async findById(projectId) {
        const [rows] = await db.execute(
            `SELECT p.*,
                    u.FullName as CreatedByName,
                    u2.FullName as UpdatedByName
             FROM projects p
             LEFT JOIN users u ON p.CreatedBy = u.UserId
             LEFT JOIN users u2 ON p.UpdatedBy = u2.UserId
             WHERE p.ProjectId = ? AND p.IsDeleted = FALSE`,
            [projectId]
        );
        return rows[0];
    }

    // Find all projects with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT p.*,
                   u.FullName as CreatedByName,
                   (SELECT COUNT(*) FROM project_spends ps WHERE ps.ProjectId = p.ProjectId AND ps.IsDeleted = FALSE) as TotalSpends,
                   (SELECT COALESCE(SUM(Amount), 0) FROM project_spends ps WHERE ps.ProjectId = p.ProjectId AND ps.IsDeleted = FALSE) as TotalAmount
            FROM projects p
            LEFT JOIN users u ON p.CreatedBy = u.UserId
            WHERE p.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.status) {
            query += ' AND p.Status = ?';
            params.push(filters.status);
        }

        if (filters.search) {
            query += ' AND (p.ProjectName LIKE ? OR p.ProjectTitle LIKE ? OR p.ProjectDescription LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (filters.startDateFrom) {
            query += ' AND p.StartDate >= ?';
            params.push(filters.startDateFrom);
        }

        if (filters.startDateTo) {
            query += ' AND p.StartDate <= ?';
            params.push(filters.startDateTo);
        }

        if (filters.isActive !== undefined) {
            query += ' AND p.IsActive = ?';
            params.push(filters.isActive);
        }

        query += ' ORDER BY p.CreatedDate DESC';

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

    // Update project
    static async update(projectId, updateData, updatedBy) {
        const allowedFields = [
            'ProjectName', 'ProjectTitle', 'ProjectDescription', 'Objective',
            'BannerUrl', 'StartDate', 'StartTime', 'EndDate', 'EndTime',
            'Location', 'Latitude', 'Longitude', 'VolunteerTitle', 'VolunteerDescription', 'Status', 'IsActive'
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
        params.push(projectId);

        const [result] = await db.execute(
            `UPDATE projects SET ${updates.join(', ')} WHERE ProjectId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Soft delete project
    static async delete(projectId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE projects SET IsDeleted = TRUE, UpdatedBy = ? WHERE ProjectId = ?`,
            [deletedBy, projectId]
        );
        return result.affectedRows > 0;
    }

    // Get project statistics
    static async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN Status = 'Planned' THEN 1 ELSE 0 END) as planned,
                SUM(CASE WHEN Status = 'Ongoing' THEN 1 ELSE 0 END) as ongoing,
                SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM projects
            WHERE IsDeleted = FALSE
        `;

        const [rows] = await db.execute(query, []);
        return rows[0];
    }
}

module.exports = Project;
