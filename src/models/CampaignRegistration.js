const db = require('../config/database');

class CampaignRegistration {
    // Create registration with dynamic field responses (public, no auth)
    static async register(data) {
        const [result] = await db.execute(
            `INSERT INTO campaign_registrations (CampaignId) VALUES (?)`,
            [data.campaignId]
        );

        // Save dynamic field responses
        if (data.responses && data.responses.length > 0) {
            for (const resp of data.responses) {
                await db.execute(
                    `INSERT INTO campaign_registration_responses (RegistrationId, FieldId, ResponseValue)
                     VALUES (?, ?, ?)`,
                    [result.insertId, resp.fieldId, resp.value || '']
                );
            }
        }

        return result.insertId;
    }

    // Find all registrations with pagination, search, and joined field responses
    static async findAll(filters = {}) {
        let countQuery = `
            SELECT COUNT(DISTINCT cr.RegistrationId) as total
            FROM campaign_registrations cr
            LEFT JOIN campaign_registration_responses crr ON cr.RegistrationId = crr.RegistrationId
            LEFT JOIN campaign_registration_fields crf ON crr.FieldId = crf.FieldId
            WHERE cr.IsDeleted = FALSE
        `;
        let query = `
            SELECT cr.*, c.CampaignName, c.CampaignCode
            FROM campaign_registrations cr
            LEFT JOIN campaigns c ON cr.CampaignId = c.CampaignId
            WHERE cr.IsDeleted = FALSE
        `;
        const params = [];
        const countParams = [];

        if (filters.campaignId) {
            query += ' AND cr.CampaignId = ?';
            countQuery += ' AND cr.CampaignId = ?';
            params.push(filters.campaignId);
            countParams.push(filters.campaignId);
        }

        if (filters.status) {
            query += ' AND cr.Status = ?';
            countQuery += ' AND cr.Status = ?';
            params.push(filters.status);
            countParams.push(filters.status);
        }

        if (filters.search) {
            // Search across all response values for the name
            query += ` AND cr.RegistrationId IN (
                SELECT DISTINCT crr2.RegistrationId FROM campaign_registration_responses crr2
                WHERE crr2.ResponseValue LIKE ?
            )`;
            countQuery += ` AND cr.RegistrationId IN (
                SELECT DISTINCT crr2.RegistrationId FROM campaign_registration_responses crr2
                WHERE crr2.ResponseValue LIKE ?
            )`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm);
            countParams.push(searchTerm);
        }

        // Get total count
        const [countRows] = await db.execute(countQuery, countParams);
        const total = countRows[0]?.total || 0;

        query += ' ORDER BY cr.CreatedDate DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filters.offset));
            }
        }

        const [rows] = await db.execute(query, params);

        // Fetch responses for each registration
        for (const row of rows) {
            const [responses] = await db.execute(
                `SELECT crr.*, crf.FieldName, crf.FieldLabel, crf.FieldType
                 FROM campaign_registration_responses crr
                 JOIN campaign_registration_fields crf ON crr.FieldId = crf.FieldId
                 WHERE crr.RegistrationId = ?
                 ORDER BY crf.DisplayOrder ASC`,
                [row.RegistrationId]
            );
            row.responses = responses;
        }

        return { registrations: rows, total, page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1 };
    }

    // Find by ID with full details
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT cr.*, c.CampaignName, c.CampaignCode
             FROM campaign_registrations cr
             LEFT JOIN campaigns c ON cr.CampaignId = c.CampaignId
             WHERE cr.RegistrationId = ? AND cr.IsDeleted = FALSE`,
            [id]
        );
        if (rows.length === 0) return null;

        const [responses] = await db.execute(
            `SELECT crr.*, crf.FieldName, crf.FieldLabel, crf.FieldType
             FROM campaign_registration_responses crr
             JOIN campaign_registration_fields crf ON crr.FieldId = crf.FieldId
             WHERE crr.RegistrationId = ?
             ORDER BY crf.DisplayOrder ASC`,
            [id]
        );

        return { ...rows[0], responses };
    }

    // Update registration responses
    static async update(id, data, updatedBy) {
        // Update status if provided
        if (data.status) {
            await db.execute(
                `UPDATE campaign_registrations SET Status = ?, UpdatedBy = ? WHERE RegistrationId = ?`,
                [data.status, updatedBy, id]
            );
        }

        // Update responses if provided
        if (data.responses && data.responses.length > 0) {
            for (const resp of data.responses) {
                // Upsert: try update first, then insert
                const [existing] = await db.execute(
                    `SELECT ResponseId FROM campaign_registration_responses WHERE RegistrationId = ? AND FieldId = ?`,
                    [id, resp.fieldId]
                );
                if (existing.length > 0) {
                    await db.execute(
                        `UPDATE campaign_registration_responses SET ResponseValue = ? WHERE RegistrationId = ? AND FieldId = ?`,
                        [resp.value || '', id, resp.fieldId]
                    );
                } else {
                    await db.execute(
                        `INSERT INTO campaign_registration_responses (RegistrationId, FieldId, ResponseValue) VALUES (?, ?, ?)`,
                        [id, resp.fieldId, resp.value || '']
                    );
                }
            }
        }

        await db.execute(
            `UPDATE campaign_registrations SET UpdatedBy = ?, UpdatedDate = NOW() WHERE RegistrationId = ?`,
            [updatedBy, id]
        );

        return true;
    }

    // Soft delete
    static async delete(id) {
        const [result] = await db.execute(
            `UPDATE campaign_registrations SET IsDeleted = TRUE WHERE RegistrationId = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Export all registrations for a campaign (for Excel)
    static async exportData(campaignId) {
        const [registrations] = await db.execute(
            `SELECT cr.*
             FROM campaign_registrations cr
             WHERE cr.CampaignId = ? AND cr.IsDeleted = FALSE
             ORDER BY cr.CreatedDate ASC`,
            [campaignId]
        );

        // Get all fields for this campaign
        const [fields] = await db.execute(
            `SELECT * FROM campaign_registration_fields
             WHERE CampaignId = ? AND IsDeleted = FALSE
             ORDER BY DisplayOrder ASC`,
            [campaignId]
        );

        // Get all responses in one batch
        if (registrations.length > 0) {
            const regIds = registrations.map(r => r.RegistrationId);
            const placeholders = regIds.map(() => '?').join(',');
            const [allResponses] = await db.execute(
                `SELECT crr.*, crf.FieldName, crf.FieldLabel
                 FROM campaign_registration_responses crr
                 JOIN campaign_registration_fields crf ON crr.FieldId = crf.FieldId
                 WHERE crr.RegistrationId IN (${placeholders})`,
                regIds
            );

            // Group responses by registration
            for (const reg of registrations) {
                reg.responses = allResponses.filter(r => r.RegistrationId === reg.RegistrationId);
            }
        }

        return { registrations, fields };
    }

    // Count registrations for a campaign
    static async countByCampaign(campaignId) {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as total FROM campaign_registrations
             WHERE CampaignId = ? AND IsDeleted = FALSE`,
            [campaignId]
        );
        return rows[0]?.total || 0;
    }
}

module.exports = CampaignRegistration;
