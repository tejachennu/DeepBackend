const db = require('../config/database');

class ProjectSpend {
    // Create a new project spend
    static async create(spendData) {
        const {
            projectId, expenseName, expenseDescription, amount,
            paidWithTrustAmount, paidWithOwnMoney, paymentMode, paidTo, billImageUrl,
            billDate, spentDate, createdBy
        } = spendData;

        const [result] = await db.execute(
            `INSERT INTO project_spends (
                ProjectId, ExpenseName, ExpenseDescription, Amount,
                PaidWithTrustAmount, PaidWithOwnMoney, PaymentMode, PaidTo, BillImageUrl,
                BillDate, SpentDate, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                projectId, expenseName, expenseDescription, amount,
                paidWithTrustAmount || false, paidWithOwnMoney || false, paymentMode || 'Cash', paidTo, billImageUrl,
                billDate, spentDate, createdBy
            ]
        );
        return result.insertId;
    }

    // Find spend by ID
    static async findById(spendId) {
        const [rows] = await db.execute(
            `SELECT ps.*,
                    p.ProjectName,
                    u.FullName as CreatedByName,
                    u2.FullName as ApprovedByName,
                    u3.FullName as SettledByName
             FROM project_spends ps
             LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
             LEFT JOIN users u ON ps.CreatedBy = u.UserId
             LEFT JOIN users u2 ON ps.ApprovedBy = u2.UserId
             LEFT JOIN users u3 ON ps.SettledBy = u3.UserId
             WHERE ps.ProjectSpendId = ? AND ps.IsDeleted = FALSE`,
            [spendId]
        );
        return rows[0];
    }

    // Find all spends for a project
    static async findByProjectId(projectId, filters = {}) {
        let query = `
            SELECT ps.*,
                   p.ProjectName,
                   u.FullName as CreatedByName,
                   u2.FullName as ApprovedByName,
                   u3.FullName as SettledByName
            FROM project_spends ps
            LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
            LEFT JOIN users u ON ps.CreatedBy = u.UserId
            LEFT JOIN users u2 ON ps.ApprovedBy = u2.UserId
            LEFT JOIN users u3 ON ps.SettledBy = u3.UserId
            WHERE ps.ProjectId = ? AND ps.IsDeleted = FALSE
        `;
        const params = [projectId];

        if (filters.status) {
            query += ' AND ps.Status = ?';
            params.push(filters.status);
        }

        if (filters.paymentMode) {
            query += ' AND ps.PaymentMode = ?';
            params.push(filters.paymentMode);
        }

        if (filters.dateFrom) {
            query += ' AND ps.SpentDate >= ?';
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            query += ' AND ps.SpentDate <= ?';
            params.push(filters.dateTo);
        }

        query += ' ORDER BY ps.SpentDate DESC, ps.CreatedDate DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Find all spends with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT ps.*,
                   p.ProjectName,
                   o.OrganizationName,
                   u.FullName as CreatedByName,
                   u2.FullName as ApprovedByName
            FROM project_spends ps
            LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
            LEFT JOIN organizations o ON p.OrganizationId = o.OrganizationId
            LEFT JOIN users u ON ps.CreatedBy = u.UserId
            LEFT JOIN users u2 ON ps.ApprovedBy = u2.UserId
            WHERE ps.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.projectId) {
            query += ' AND ps.ProjectId = ?';
            params.push(filters.projectId);
        }

        if (filters.organizationId) {
            query += ' AND p.OrganizationId = ?';
            params.push(filters.organizationId);
        }

        if (filters.status) {
            query += ' AND ps.Status = ?';
            params.push(filters.status);
        }

        if (filters.search) {
            query += ' AND (ps.ExpenseName LIKE ? OR ps.PaidTo LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY ps.CreatedDate DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(parseInt(filters.offset));
            }
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Update spend
    static async update(spendId, updateData, updatedBy) {
        const allowedFields = [
            'ExpenseName', 'ExpenseDescription', 'Amount',
            'PaidWithTrustAmount', 'PaymentMode', 'PaidTo', 'BillImageUrl',
            'BillDate', 'SpentDate'
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
        params.push(spendId);

        const [result] = await db.execute(
            `UPDATE project_spends SET ${updates.join(', ')} WHERE ProjectSpendId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Approve spend
    static async approve(spendId, approvedBy) {
        const [result] = await db.execute(
            `UPDATE project_spends 
             SET Status = 'Approved', ApprovedBy = ?, ApprovedDate = NOW(), UpdatedBy = ?
             WHERE ProjectSpendId = ? AND IsDeleted = FALSE`,
            [approvedBy, approvedBy, spendId]
        );
        return result.affectedRows > 0;
    }

    // Reject spend
    static async reject(spendId, rejectedBy) {
        const [result] = await db.execute(
            `UPDATE project_spends 
             SET Status = 'Rejected', ApprovedBy = ?, ApprovedDate = NOW(), UpdatedBy = ?
             WHERE ProjectSpendId = ? AND IsDeleted = FALSE`,
            [rejectedBy, rejectedBy, spendId]
        );
        return result.affectedRows > 0;
    }

    // Soft delete spend
    static async delete(spendId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE project_spends SET IsDeleted = TRUE, UpdatedBy = ? WHERE ProjectSpendId = ?`,
            [deletedBy, spendId]
        );
        return result.affectedRows > 0;
    }

    // Get spend summary for a project
    static async getSummaryByProject(projectId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as totalExpenses,
                COALESCE(SUM(Amount), 0) as totalAmount,
                COALESCE(SUM(CASE WHEN Status = 'Approved' THEN Amount ELSE 0 END), 0) as approvedAmount,
                COALESCE(SUM(CASE WHEN Status = 'Pending' THEN Amount ELSE 0 END), 0) as pendingAmount,
                COALESCE(SUM(CASE WHEN PaidWithTrustAmount = TRUE THEN Amount ELSE 0 END), 0) as trustAmount
             FROM project_spends
             WHERE ProjectId = ? AND IsDeleted = FALSE`,
            [projectId]
        );
        return rows[0];
    }

    // Get spend breakdown by payment mode
    static async getBreakdownByPaymentMode(projectId) {
        const [rows] = await db.execute(
            `SELECT 
                PaymentMode,
                COUNT(*) as count,
                COALESCE(SUM(Amount), 0) as total
             FROM project_spends
             WHERE ProjectId = ? AND IsDeleted = FALSE
             GROUP BY PaymentMode`,
            [projectId]
        );
        return rows;
    }

    // Settle a spend (mark as reimbursed)
    static async settle(spendId, settledBy, settlementData = {}) {
        const { settlementNotes, settlementAmount } = settlementData;
        const [result] = await db.execute(
            `UPDATE project_spends 
             SET IsSettled = TRUE, SettledBy = ?, SettledDate = NOW(), 
                 SettlementNotes = ?, SettlementAmount = ?, UpdatedBy = ?
             WHERE ProjectSpendId = ? AND IsDeleted = FALSE`,
            [settledBy, settlementNotes || null, settlementAmount || null, settledBy, spendId]
        );
        return result.affectedRows > 0;
    }

    // Get unsettled spends (own money expenses that need reimbursement)
    static async getUnsettled(projectId = null) {
        let query = `
            SELECT ps.*,
                   p.ProjectName,
                   u.FullName as CreatedByName
            FROM project_spends ps
            LEFT JOIN projects p ON ps.ProjectId = p.ProjectId
            LEFT JOIN users u ON ps.CreatedBy = u.UserId
            WHERE ps.IsDeleted = FALSE 
              AND ps.PaidWithOwnMoney = TRUE 
              AND ps.IsSettled = FALSE
        `;
        const params = [];

        if (projectId) {
            query += ' AND ps.ProjectId = ?';
            params.push(projectId);
        }

        query += ' ORDER BY ps.SpentDate DESC';

        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = ProjectSpend;
