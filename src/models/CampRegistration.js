const db = require('../config/database');

class CampRegistration {
    // Register (public — no auth required)
    static async register(registrationData) {
        const { campId, responses } = registrationData;
        const connection = await db.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                `INSERT INTO camp_registrations (CampId) VALUES (?)`,
                [campId]
            );
            const registrationId = result.insertId;

            // Insert responses
            if (responses && responses.length > 0) {
                for (const resp of responses) {
                    await connection.execute(
                        `INSERT INTO camp_registration_responses (RegistrationId, FieldId, ResponseValue) VALUES (?, ?, ?)`,
                        [registrationId, resp.fieldId, resp.value || '']
                    );
                }
            }

            await connection.commit();
            return registrationId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Find by ID with responses
    static async findById(registrationId) {
        const [rows] = await db.execute(
            `SELECT r.*, c.CampName
             FROM camp_registrations r
             JOIN camps c ON r.CampId = c.CampId
             WHERE r.RegistrationId = ? AND r.IsDeleted = FALSE`,
            [registrationId]
        );
        if (!rows[0]) return null;

        const [responses] = await db.execute(
            `SELECT rr.*, f.FieldName, f.FieldLabel, f.FieldType
             FROM camp_registration_responses rr
             JOIN camp_registration_fields f ON rr.FieldId = f.FieldId
             WHERE rr.RegistrationId = ?
             ORDER BY f.DisplayOrder ASC`,
            [registrationId]
        );

        return { ...rows[0], responses };
    }

    // Find all for a camp (admin - with pagination, search & date filter)
    static async findByCampId(campId, { search, limit = 20, offset = 0, fromDate, toDate } = {}) {
        let countQuery = `SELECT COUNT(*) as total FROM camp_registrations WHERE CampId = ? AND IsDeleted = FALSE`;
        let query = `
            SELECT r.*, c.CampName
            FROM camp_registrations r
            JOIN camps c ON r.CampId = c.CampId
            WHERE r.CampId = ? AND r.IsDeleted = FALSE
        `;
        const params = [campId];

        if (search) {
            const searchFilter = `
                AND r.RegistrationId IN (
                    SELECT rr.RegistrationId FROM camp_registration_responses rr
                    WHERE rr.ResponseValue LIKE ?
                )
            `;
            query += searchFilter;
            countQuery += searchFilter.replace('AND r.RegistrationId', 'AND RegistrationId');
            params.push(`%${search}%`);
        }

        if (fromDate) {
            const dateFilter = ` AND r.CreatedDate >= ?`;
            query += dateFilter;
            countQuery += ` AND CreatedDate >= ?`;
            params.push(`${fromDate} 00:00:00`);
        }

        if (toDate) {
            const dateFilter = ` AND r.CreatedDate <= ?`;
            query += dateFilter;
            countQuery += ` AND CreatedDate <= ?`;
            params.push(`${toDate} 23:59:59`);
        }

        // Get total count
        const countParams = [...params];
        const [countRows] = await db.execute(countQuery, countParams);
        const total = countRows[0].total;

        query += ` ORDER BY r.CreatedDate DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.execute(query, params);

        // Fetch responses for each registration
        for (const reg of rows) {
            const [responses] = await db.execute(
                `SELECT rr.*, f.FieldName, f.FieldLabel, f.FieldType
                 FROM camp_registration_responses rr
                 JOIN camp_registration_fields f ON rr.FieldId = f.FieldId
                 WHERE rr.RegistrationId = ?
                 ORDER BY f.DisplayOrder ASC`,
                [reg.RegistrationId]
            );
            reg.responses = responses;
        }

        return { registrations: rows, total };
    }

    // Update registration
    static async update(registrationId, updateData, updatedBy) {
        // Status removal applied
        if (updateData.responses) {
            for (const resp of updateData.responses) {
                await db.execute(
                    `UPDATE camp_registration_responses SET ResponseValue = ? WHERE RegistrationId = ? AND FieldId = ?`,
                    [resp.value, registrationId, resp.fieldId]
                );
            }
        }
    }

    // Soft delete
    static async delete(registrationId, deletedBy) {
        await db.execute(
            `UPDATE camp_registrations SET IsDeleted = TRUE, UpdatedBy = ? WHERE RegistrationId = ?`,
            [deletedBy, registrationId]
        );
    }

    // Export data for Excel
    static async getExportData(campId, { fromDate, toDate } = {}) {
        let query = `SELECT r.RegistrationId, r.CreatedDate
             FROM camp_registrations r
             WHERE r.CampId = ? AND r.IsDeleted = FALSE`;
        const params = [campId];

        if (fromDate) {
            query += ` AND r.CreatedDate >= ?`;
            params.push(`${fromDate} 00:00:00`);
        }
        if (toDate) {
            query += ` AND r.CreatedDate <= ?`;
            params.push(`${toDate} 23:59:59`);
        }

        query += ` ORDER BY r.CreatedDate DESC`;

        const [registrations] = await db.execute(query, params);

        const [fields] = await db.execute(
            `SELECT FieldId, FieldLabel FROM camp_registration_fields WHERE CampId = ? AND IsDeleted = FALSE ORDER BY DisplayOrder ASC`,
            [campId]
        );

        for (const reg of registrations) {
            const [responses] = await db.execute(
                `SELECT rr.FieldId, rr.ResponseValue FROM camp_registration_responses rr WHERE rr.RegistrationId = ?`,
                [reg.RegistrationId]
            );
            reg.responses = responses;
        }

        return { registrations, fields };
    }
}

module.exports = CampRegistration;
