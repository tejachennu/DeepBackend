const db = require('../config/database');

class VolunteerFormField {
    static async create(data) {
        const [result] = await db.execute(
            `INSERT INTO volunteer_form_fields 
             (ProjectId, FieldName, FieldLabel, FieldType, Options, IsRequired, DisplayOrder, CreatedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.projectId,
                data.fieldName,
                data.fieldLabel,
                data.fieldType || 'TEXT',
                data.options ? JSON.stringify(data.options) : null,
                data.isRequired || false,
                data.displayOrder || 0,
                data.createdBy
            ]
        );
        return result.insertId;
    }

    static async findByProject(projectId) {
        const [rows] = await db.execute(
            `SELECT * FROM volunteer_form_fields 
             WHERE ProjectId = ? AND IsDeleted = FALSE AND IsActive = TRUE
             ORDER BY DisplayOrder ASC, FieldId ASC`,
            [projectId]
        );
        return rows.map(row => ({
            ...row,
            Options: row.Options ? (typeof row.Options === 'string' ? JSON.parse(row.Options) : row.Options) : []
        }));
    }

    static async findById(id) {
        const [rows] = await db.execute(
            `SELECT * FROM volunteer_form_fields WHERE FieldId = ? AND IsDeleted = FALSE`,
            [id]
        );
        if (rows.length === 0) return null;
        const row = rows[0];
        row.Options = row.Options ? (typeof row.Options === 'string' ? JSON.parse(row.Options) : row.Options) : [];
        return row;
    }

    static async update(id, data, userId) {
        const fields = [];
        const values = [];

        if (data.fieldName !== undefined) { fields.push('FieldName = ?'); values.push(data.fieldName); }
        if (data.fieldLabel !== undefined) { fields.push('FieldLabel = ?'); values.push(data.fieldLabel); }
        if (data.fieldType !== undefined) { fields.push('FieldType = ?'); values.push(data.fieldType); }
        if (data.options !== undefined) { fields.push('Options = ?'); values.push(JSON.stringify(data.options)); }
        if (data.isRequired !== undefined) { fields.push('IsRequired = ?'); values.push(data.isRequired); }
        if (data.displayOrder !== undefined) { fields.push('DisplayOrder = ?'); values.push(data.displayOrder); }
        if (data.isActive !== undefined) { fields.push('IsActive = ?'); values.push(data.isActive); }

        if (fields.length === 0) return false;

        fields.push('UpdatedBy = ?');
        values.push(userId);
        values.push(id);

        const [result] = await db.execute(
            `UPDATE volunteer_form_fields SET ${fields.join(', ')} WHERE FieldId = ? AND IsDeleted = FALSE`,
            values
        );
        return result.affectedRows > 0;
    }

    static async delete(id, userId) {
        const [result] = await db.execute(
            `UPDATE volunteer_form_fields SET IsDeleted = TRUE, UpdatedBy = ? WHERE FieldId = ?`,
            [userId, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = VolunteerFormField;
