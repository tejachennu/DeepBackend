const db = require('../config/database');

class CampRegistrationField {
    // Create a new field for a camp's registration form
    static async create(fieldData) {
        const { campId, fieldName, fieldLabel, fieldType, options, isRequired, displayOrder, createdBy } = fieldData;
        const [result] = await db.execute(
            `INSERT INTO camp_registration_fields (CampId, FieldName, FieldLabel, FieldType, Options, IsRequired, DisplayOrder, CreatedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [campId, fieldName, fieldLabel, fieldType || 'TEXT', options ? JSON.stringify(options) : null, isRequired || false, displayOrder || 0, createdBy]
        );
        return result.insertId;
    }

    // Get all fields for a camp
    static async findByCampId(campId) {
        const [rows] = await db.execute(
            `SELECT * FROM camp_registration_fields WHERE CampId = ? AND IsDeleted = FALSE ORDER BY DisplayOrder ASC, FieldId ASC`,
            [campId]
        );
        return rows.map(row => ({
            ...row,
            Options: row.Options ? (typeof row.Options === 'string' ? JSON.parse(row.Options) : row.Options) : []
        }));
    }

    // Get a single field by ID
    static async findById(fieldId) {
        const [rows] = await db.execute(
            `SELECT * FROM camp_registration_fields WHERE FieldId = ? AND IsDeleted = FALSE`,
            [fieldId]
        );
        if (rows[0] && rows[0].Options) {
            rows[0].Options = typeof rows[0].Options === 'string' ? JSON.parse(rows[0].Options) : rows[0].Options;
        }
        return rows[0];
    }

    // Update a field
    static async update(fieldId, updateData, updatedBy) {
        const fields = [];
        const values = [];

        if (updateData.fieldLabel !== undefined) { fields.push('FieldLabel = ?'); values.push(updateData.fieldLabel); }
        if (updateData.fieldType !== undefined) { fields.push('FieldType = ?'); values.push(updateData.fieldType); }
        if (updateData.options !== undefined) { fields.push('Options = ?'); values.push(JSON.stringify(updateData.options)); }
        if (updateData.isRequired !== undefined) { fields.push('IsRequired = ?'); values.push(updateData.isRequired); }
        if (updateData.displayOrder !== undefined) { fields.push('DisplayOrder = ?'); values.push(updateData.displayOrder); }

        fields.push('UpdatedBy = ?');
        values.push(updatedBy);
        values.push(fieldId);

        if (fields.length === 0) return;

        await db.execute(
            `UPDATE camp_registration_fields SET ${fields.join(', ')} WHERE FieldId = ?`,
            values
        );
    }

    // Soft delete a field
    static async delete(fieldId, deletedBy) {
        await db.execute(
            `UPDATE camp_registration_fields SET IsDeleted = TRUE, UpdatedBy = ? WHERE FieldId = ?`,
            [deletedBy, fieldId]
        );
    }
}

module.exports = CampRegistrationField;
