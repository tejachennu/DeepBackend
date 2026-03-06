const db = require('../config/database');

class BeneficiaryDonation {
    // Create a new beneficiary donation
    static async create(data) {
        try {
            const {
                projectId, organizationId, title, description, donationType,
                amount, currency, receivedItemName, receivedItemDescription,
                donationDate, beneficiaryName, beneficiaryContact, beneficiaryAddress, createdBy
            } = data;

            console.log('--- Incoming Donation Data ---');
            console.log(JSON.stringify(data, null, 2));

            const queryParams = [
                projectId ?? null,
                organizationId ?? null,
                title ?? null,
                description ?? null,
                donationType || 'CASH',
                amount || 0,
                currency || 'INR',
                receivedItemName ?? null,
                receivedItemDescription ?? null,
                donationDate || new Date(),
                beneficiaryName ?? null,
                beneficiaryContact ?? null,
                beneficiaryAddress ?? null,
                createdBy ?? null
            ];

            console.log('--- Mapped Query Params ---');
            console.log(queryParams);

            const [result] = await db.execute(
                `INSERT INTO beneficiary_donations (
                    ProjectId, OrganizationId, Title, Description, DonationType,
                    Amount, Currency, ReceivedItemName, ReceivedItemDescription,
                    DonationDate, BeneficiaryName, BeneficiaryContact, BeneficiaryAddress, CreatedBy
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                queryParams
            );

            console.log('--- Insertion Success ---');
            console.log('Inserted ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('--- DB Insertion Error ---');
            console.error(error);
            throw error;
        }
    }

    // Find by ID
    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT bd.*,
                    p.ProjectName,
                    o.OrganizationName,
                    u.FullName as CreatedByName,
                    (SELECT COUNT(*) FROM beneficiary_donation_media WHERE BeneficiaryDonationId = bd.BeneficiaryDonationId AND IsDeleted = FALSE) as MediaCount
             FROM beneficiary_donations bd
             LEFT JOIN projects p ON bd.ProjectId = p.ProjectId
             LEFT JOIN organizations o ON bd.OrganizationId = o.OrganizationId
             LEFT JOIN users u ON bd.CreatedBy = u.UserId
             WHERE bd.BeneficiaryDonationId = ? AND bd.IsDeleted = FALSE`,
            [id]
        );
        return rows[0];
    }

    // Find all with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT bd.*,
                   p.ProjectName,
                   o.OrganizationName,
                   (SELECT COUNT(*) FROM beneficiary_donation_media WHERE BeneficiaryDonationId = bd.BeneficiaryDonationId AND MediaType = 'IMAGE' AND IsDeleted = FALSE) as ImageCount,
                   (SELECT COUNT(*) FROM beneficiary_donation_media WHERE BeneficiaryDonationId = bd.BeneficiaryDonationId AND MediaType = 'VIDEO' AND IsDeleted = FALSE) as VideoCount
            FROM beneficiary_donations bd
            LEFT JOIN projects p ON bd.ProjectId = p.ProjectId
            LEFT JOIN organizations o ON bd.OrganizationId = o.OrganizationId
            WHERE bd.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) {
            query += ' AND bd.ProjectId = ?';
            params.push(filters.projectId);
        }
        if (filters.organizationId) {
            query += ' AND bd.OrganizationId = ?';
            params.push(filters.organizationId);
        }
        if (filters.status) {
            query += ' AND bd.Status = ?';
            params.push(filters.status);
        }
        if (filters.donationType) {
            query += ' AND bd.DonationType = ?';
            params.push(filters.donationType);
        }
        if (filters.dateFrom) {
            query += ' AND bd.DonationDate >= ?';
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += ' AND bd.DonationDate <= ?';
            params.push(filters.dateTo);
        }
        if (filters.search) {
            query += ' AND (bd.Title LIKE ? OR bd.Description LIKE ? OR bd.BeneficiaryName LIKE ?)';
            const s = `%${filters.search}%`;
            params.push(s, s, s);
        }

        query += ' ORDER BY bd.DonationDate DESC';
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

    // Update
    static async update(id, data, updatedBy) {
        const allowedFields = [
            'Title', 'Description', 'DonationType', 'Amount', 'Currency',
            'ReceivedItemName', 'ReceivedItemDescription', 'DonationDate', 'Status',
            'BeneficiaryName', 'BeneficiaryContact', 'BeneficiaryAddress'
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
            `UPDATE beneficiary_donations SET ${updates.join(', ')} WHERE BeneficiaryDonationId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Delete (soft)
    static async delete(id, deletedBy) {
        const [result] = await db.execute(
            `UPDATE beneficiary_donations SET IsDeleted = TRUE, UpdatedBy = ? WHERE BeneficiaryDonationId = ?`,
            [deletedBy, id]
        );
        return result.affectedRows > 0;
    }

    // ==================== Media Operations ====================
    static async addMedia(data) {
        const { beneficiaryDonationId, mediaType, mediaUrl, thumbnailUrl, fileName, fileSize, mimeType, caption, displayOrder, uploadedBy } = data;
        const [result] = await db.execute(
            `INSERT INTO beneficiary_donation_media (BeneficiaryDonationId, MediaType, MediaUrl, ThumbnailUrl, FileName, FileSize, MimeType, Caption, DisplayOrder, UploadedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [beneficiaryDonationId ?? null, mediaType ?? null, mediaUrl ?? null, thumbnailUrl ?? null, fileName ?? null, fileSize ?? null, mimeType ?? null, caption ?? null, displayOrder || 0, uploadedBy ?? null]
        );
        return result.insertId;
    }

    static async getMedia(id, mediaType = null) {
        let query = `SELECT * FROM beneficiary_donation_media WHERE BeneficiaryDonationId = ? AND IsDeleted = FALSE`;
        const params = [id];
        if (mediaType) {
            query += ' AND MediaType = ?';
            params.push(mediaType);
        }
        query += ' ORDER BY DisplayOrder ASC, UploadedDate DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async deleteMedia(mediaId) {
        const [result] = await db.execute(`UPDATE beneficiary_donation_media SET IsDeleted = TRUE WHERE MediaId = ?`, [mediaId]);
        return result.affectedRows > 0;
    }

    // Get summary by project
    static async getSummary(projectId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as totalDonations,
                COALESCE(SUM(Amount), 0) as totalAmount,
                SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) as completedCount,
                SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) as pendingCount
             FROM beneficiary_donations WHERE ProjectId = ? AND IsDeleted = FALSE`,
            [projectId]
        );
        return rows[0];
    }
}

module.exports = BeneficiaryDonation;
