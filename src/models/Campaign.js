const db = require('../config/database');

class Campaign {
    // Create a new campaign
    static async create(campaignData) {
        const {
            projectId, campaignName, campaignCode, campaignType,
            imageUrls, videoUrls, description, targetAmount,
            startDate, endDate, isPublic, razorpayEnabled, createdBy
        } = campaignData;

        // Generate campaign code if not provided
        const code = campaignCode || `CAMP-${Date.now().toString(36).toUpperCase()}`;

        const [result] = await db.execute(
            `INSERT INTO campaigns (
                ProjectId, CampaignName, CampaignCode, CampaignType,
                ImageUrls, VideoUrls, Description, TargetAmount,
                StartDate, EndDate, IsPublic, RazorpayEnabled, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectId || null, campaignName, code, campaignType || 'FUNDRAISING',
                JSON.stringify(imageUrls || []), JSON.stringify(videoUrls || []),
                description, targetAmount || 0, startDate || null, endDate || null,
                isPublic !== false, razorpayEnabled !== false, createdBy
            ]
        );
        return result.insertId;
    }

    // Find campaign by ID
    static async findById(campaignId) {
        const [rows] = await db.execute(
            `SELECT c.*,
                    p.ProjectName,
                    u.FullName as CreatedByName,
                    (SELECT COUNT(*) FROM donations WHERE CampaignId = c.CampaignId AND Status = 'Completed' AND IsDeleted = FALSE) as DonationCount
             FROM campaigns c
             LEFT JOIN projects p ON c.ProjectId = p.ProjectId
             LEFT JOIN users u ON c.CreatedBy = u.UserId
             WHERE c.CampaignId = ? AND c.IsDeleted = FALSE`,
            [campaignId]
        );
        if (rows[0]) {
            const row = rows[0];
            if (row.ImageUrls && typeof row.ImageUrls === 'string') {
                try { row.ImageUrls = JSON.parse(row.ImageUrls); } catch (e) { row.ImageUrls = []; }
            }
            if (!row.ImageUrls) row.ImageUrls = [];

            if (row.VideoUrls && typeof row.VideoUrls === 'string') {
                try { row.VideoUrls = JSON.parse(row.VideoUrls); } catch (e) { row.VideoUrls = []; }
            }
            if (!row.VideoUrls) row.VideoUrls = [];
        }
        return rows[0];
    }

    // Find by campaign code
    static async findByCode(campaignCode) {
        const [rows] = await db.execute(
            `SELECT c.*, 
                    p.ProjectName,
                    (SELECT COUNT(*) FROM donations WHERE CampaignId = c.CampaignId AND Status = 'Completed' AND IsDeleted = FALSE) as DonationCount
             FROM campaigns c
             LEFT JOIN projects p ON c.ProjectId = p.ProjectId
             WHERE c.CampaignCode = ? AND c.IsDeleted = FALSE`,
            [campaignCode]
        );
        if (rows[0]) {
            const row = rows[0];
            if (row.ImageUrls && typeof row.ImageUrls === 'string') {
                try { row.ImageUrls = JSON.parse(row.ImageUrls); } catch (e) { row.ImageUrls = []; }
            }
            if (!row.ImageUrls) row.ImageUrls = [];

            if (row.VideoUrls && typeof row.VideoUrls === 'string') {
                try { row.VideoUrls = JSON.parse(row.VideoUrls); } catch (e) { row.VideoUrls = []; }
            }
            if (!row.VideoUrls) row.VideoUrls = [];
        }
        return rows[0];
    }

    // Find all campaigns with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT c.*,
                   p.ProjectName,
                   (SELECT COUNT(*) FROM donations WHERE CampaignId = c.CampaignId AND Status = 'Completed' AND IsDeleted = FALSE) as DonationCount
            FROM campaigns c
            LEFT JOIN projects p ON c.ProjectId = p.ProjectId
            WHERE c.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) {
            query += ' AND c.ProjectId = ?';
            params.push(filters.projectId);
        }

        if (filters.campaignType) {
            query += ' AND c.CampaignType = ?';
            params.push(filters.campaignType);
        }

        if (filters.campaignStatus) {
            query += ' AND c.CampaignStatus = ?';
            params.push(filters.campaignStatus);
        }

        if (filters.isPublic !== undefined) {
            query += ' AND c.IsPublic = ?';
            params.push(filters.isPublic);
        }

        if (filters.search) {
            query += ' AND (c.CampaignName LIKE ? OR c.CampaignCode LIKE ? OR c.Description LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY c.CreatedDate DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filters.offset));
            }
        }

        const [rows] = await db.execute(query, params);
        return rows.map(row => {
            let imageUrls = row.ImageUrls;
            let videoUrls = row.VideoUrls;

            if (imageUrls && typeof imageUrls === 'string') {
                try { imageUrls = JSON.parse(imageUrls); } catch (e) { imageUrls = []; }
            }
            if (!imageUrls) imageUrls = [];

            if (videoUrls && typeof videoUrls === 'string') {
                try { videoUrls = JSON.parse(videoUrls); } catch (e) { videoUrls = []; }
            }
            if (!videoUrls) videoUrls = [];

            return { ...row, ImageUrls: imageUrls, VideoUrls: videoUrls };
        });
    }

    // Get public campaigns (for donation page)
    static async getPublicCampaigns(filters = {}) {
        return this.findAll({ ...filters, isPublic: true, campaignStatus: 'Active' });
    }

    // Update campaign
    static async update(campaignId, updateData, updatedBy) {
        const allowedFields = [
            'CampaignName', 'CampaignType', 'ImageUrls', 'VideoUrls',
            'Description', 'TargetAmount', 'StartDate', 'EndDate',
            'CampaignStatus', 'IsPublic', 'RazorpayEnabled'
        ];

        const updates = [];
        const params = [];

        for (const [key, value] of Object.entries(updateData)) {
            const dbField = key.charAt(0).toUpperCase() + key.slice(1);
            if (allowedFields.includes(dbField) && value !== undefined) {
                updates.push(`${dbField} = ?`);
                if (dbField === 'ImageUrls' || dbField === 'VideoUrls') {
                    params.push(JSON.stringify(value));
                } else {
                    params.push(value);
                }
            }
        }

        if (updates.length === 0) return false;

        updates.push('UpdatedBy = ?');
        params.push(updatedBy);
        params.push(campaignId);

        const [result] = await db.execute(
            `UPDATE campaigns SET ${updates.join(', ')} WHERE CampaignId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Update collected amount
    static async updateCollectedAmount(campaignId, amount) {
        const [result] = await db.execute(
            `UPDATE campaigns SET CollectedAmount = CollectedAmount + ? WHERE CampaignId = ?`,
            [amount, campaignId]
        );
        return result.affectedRows > 0;
    }

    // Soft delete
    static async delete(campaignId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE campaigns SET IsDeleted = TRUE, UpdatedBy = ? WHERE CampaignId = ?`,
            [deletedBy, campaignId]
        );
        return result.affectedRows > 0;
    }

    // Get campaign statistics
    static async getStats(campaignId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(CASE WHEN Status = 'Completed' THEN 1 END) as totalDonations,
                COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Amount ELSE 0 END), 0) as totalCollected,
                COALESCE(SUM(CASE WHEN DonationType = 'RAZORPAY' AND Status = 'Completed' THEN Amount ELSE 0 END), 0) as onlineAmount,
                COALESCE(SUM(CASE WHEN DonationType != 'RAZORPAY' AND Status = 'Completed' THEN Amount ELSE 0 END), 0) as offlineAmount,
                COUNT(DISTINCT CASE WHEN Status = 'Completed' THEN DonorName END) as uniqueDonors
             FROM donations
             WHERE CampaignId = ? AND IsDeleted = FALSE`,
            [campaignId]
        );
        return rows[0];
    }

    // Get campaign analytics (daily trends, payment mode breakdown, top donors)
    static async getAnalytics(campaignId) {
        // Daily donation trends (last 30 days)
        const [dailyTrends] = await db.execute(
            `SELECT 
                DATE(DonationDate) as date,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Amount ELSE 0 END), 0) as amount
             FROM donations
             WHERE CampaignId = ? AND IsDeleted = FALSE AND DonationDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(DonationDate)
             ORDER BY date ASC`,
            [campaignId]
        );

        // Payment mode breakdown
        const [paymentModes] = await db.execute(
            `SELECT 
                DonationType as mode,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Amount ELSE 0 END), 0) as amount
             FROM donations
             WHERE CampaignId = ? AND IsDeleted = FALSE
             GROUP BY DonationType`,
            [campaignId]
        );

        // Top donors
        const [topDonors] = await db.execute(
            `SELECT 
                DonorName as name,
                COUNT(*) as donations,
                COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Amount ELSE 0 END), 0) as totalAmount
             FROM donations
             WHERE CampaignId = ? AND IsDeleted = FALSE AND Status = 'Completed'
             GROUP BY DonorName
             ORDER BY totalAmount DESC
             LIMIT 10`,
            [campaignId]
        );

        return {
            dailyTrends,
            paymentModes,
            topDonors
        };
    }
}

module.exports = Campaign;
