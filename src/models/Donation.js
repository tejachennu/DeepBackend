const db = require('../config/database');

class Donation {
    // Create a new donation
    static async create(donationData) {
        const {
            campaignId, projectId, donorType, donorName, phoneNumber, emailId,
            panNumber, address, donationType, amount, currency, paymentMode,
            transactionReference, razorpayOrderId, razorpayPaymentId, razorpaySignature,
            chequeNumber, chequeDate, bankName, branchName, donationDate,
            purpose, receiptNumber, is80GApplicable, status, remarks, createdBy
        } = donationData;

        // Generate receipt number if not provided and donation is completed
        const receipt = receiptNumber || (status === 'Completed' ? `RCP-${Date.now().toString(36).toUpperCase()}` : null);

        const [result] = await db.execute(
            `INSERT INTO donations (
                CampaignId, ProjectId, DonorType, DonorName, PhoneNumber, EmailId,
                PanNumber, Address, DonationType, Amount, Currency, PaymentMode,
                TransactionReference, RazorpayOrderId, RazorpayPaymentId, RazorpaySignature,
                ChequeNumber, ChequeDate, BankName, BranchName, DonationDate,
                Purpose, ReceiptNumber, Is80GApplicable, Status, Remarks, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                campaignId, projectId, donorType || 'INDIVIDUAL', donorName, phoneNumber, emailId,
                panNumber, address, donationType || 'RAZORPAY', amount, currency || 'INR', paymentMode,
                transactionReference, razorpayOrderId, razorpayPaymentId, razorpaySignature,
                chequeNumber, chequeDate, bankName, branchName, donationDate || new Date(),
                purpose, receipt, is80GApplicable || false, status || 'Pending', remarks, createdBy
            ]
        );
        return result.insertId;
    }

    // Find donation by ID
    static async findById(donationId) {
        const [rows] = await db.execute(
            `SELECT d.*,
                    c.CampaignName, c.CampaignCode,
                    p.ProjectName,
                    u.FullName as CreatedByName
             FROM donations d
             LEFT JOIN campaigns c ON d.CampaignId = c.CampaignId
             LEFT JOIN projects p ON d.ProjectId = p.ProjectId
             LEFT JOIN users u ON d.CreatedBy = u.UserId
             WHERE d.DonationId = ? AND d.IsDeleted = FALSE`,
            [donationId]
        );
        return rows[0];
    }

    // Find by Razorpay Order ID
    static async findByRazorpayOrderId(orderId) {
        const [rows] = await db.execute(
            `SELECT * FROM donations WHERE RazorpayOrderId = ? AND IsDeleted = FALSE`,
            [orderId]
        );
        return rows[0];
    }

    // Find all donations with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT d.*,
                   c.CampaignName, c.CampaignCode,
                   p.ProjectName
            FROM donations d
            LEFT JOIN campaigns c ON d.CampaignId = c.CampaignId
            LEFT JOIN projects p ON d.ProjectId = p.ProjectId
            WHERE d.IsDeleted = FALSE
        `;
        const params = [];

        if (filters.campaignId) {
            query += ' AND d.CampaignId = ?';
            params.push(filters.campaignId);
        }

        if (filters.projectId) {
            query += ' AND d.ProjectId = ?';
            params.push(filters.projectId);
        }

        if (filters.donationType) {
            query += ' AND d.DonationType = ?';
            params.push(filters.donationType);
        }

        if (filters.status) {
            query += ' AND d.Status = ?';
            params.push(filters.status);
        }

        if (filters.donorType) {
            query += ' AND d.DonorType = ?';
            params.push(filters.donorType);
        }

        if (filters.dateFrom) {
            query += ' AND d.DonationDate >= ?';
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            query += ' AND d.DonationDate <= ?';
            params.push(filters.dateTo);
        }

        if (filters.search) {
            query += ' AND (d.DonorName LIKE ? OR d.EmailId LIKE ? OR d.PhoneNumber LIKE ? OR d.ReceiptNumber LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (filters.isOffline) {
            query += ' AND d.DonationType != ?';
            params.push('RAZORPAY');
        }

        query += ' ORDER BY d.DonationDate DESC';

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

    // Find by campaign
    static async findByCampaignId(campaignId, filters = {}) {
        return this.findAll({ ...filters, campaignId });
    }

    // Update donation
    static async update(donationId, updateData, updatedBy) {
        const allowedFields = [
            'DonorType', 'DonorName', 'PhoneNumber', 'EmailId', 'PanNumber', 'Address',
            'DonationType', 'Amount', 'PaymentMode', 'TransactionReference',
            'ChequeNumber', 'ChequeDate', 'BankName', 'BranchName',
            'Purpose', 'Is80GApplicable', 'Status', 'Remarks', 'Certificate80GUrl'
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
        params.push(donationId);

        const [result] = await db.execute(
            `UPDATE donations SET ${updates.join(', ')} WHERE DonationId = ? AND IsDeleted = FALSE`,
            params
        );
        return result.affectedRows > 0;
    }

    // Complete Razorpay payment
    static async completeRazorpayPayment(donationId, paymentData) {
        const { razorpayPaymentId, razorpaySignature } = paymentData;
        const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

        const [result] = await db.execute(
            `UPDATE donations 
             SET RazorpayPaymentId = ?, RazorpaySignature = ?, 
                 Status = 'Completed', ReceiptNumber = ?
             WHERE DonationId = ?`,
            [razorpayPaymentId, razorpaySignature, receiptNumber, donationId]
        );
        return result.affectedRows > 0;
    }

    // Mark as failed
    static async markFailed(donationId, remarks) {
        const [result] = await db.execute(
            `UPDATE donations SET Status = 'Failed', Remarks = ? WHERE DonationId = ?`,
            [remarks, donationId]
        );
        return result.affectedRows > 0;
    }

    // Soft delete
    static async delete(donationId, deletedBy) {
        const [result] = await db.execute(
            `UPDATE donations SET IsDeleted = TRUE, UpdatedBy = ? WHERE DonationId = ?`,
            [deletedBy, donationId]
        );
        return result.affectedRows > 0;
    }

    // Get donation summary by campaign
    static async getSummaryByCampaign(campaignId) {
        const [rows] = await db.execute(
            `SELECT 
                COUNT(*) as totalDonations,
                COALESCE(SUM(CASE WHEN Status = 'Completed' THEN Amount ELSE 0 END), 0) as totalAmount,
                COALESCE(SUM(CASE WHEN Status = 'Completed' AND DonationType = 'RAZORPAY' THEN Amount ELSE 0 END), 0) as onlineAmount,
                COALESCE(SUM(CASE WHEN Status = 'Completed' AND DonationType = 'CASH' THEN Amount ELSE 0 END), 0) as cashAmount,
                COALESCE(SUM(CASE WHEN Status = 'Completed' AND DonationType = 'CHEQUE' THEN Amount ELSE 0 END), 0) as chequeAmount,
                COALESCE(SUM(CASE WHEN Status = 'Completed' AND DonationType = 'BANK' THEN Amount ELSE 0 END), 0) as bankAmount,
                COALESCE(SUM(CASE WHEN Status = 'Completed' AND DonationType = 'UPI' THEN Amount ELSE 0 END), 0) as upiAmount,
                COALESCE(SUM(CASE WHEN Status = 'Pending' THEN Amount ELSE 0 END), 0) as pendingAmount,
                COUNT(DISTINCT CASE WHEN Status = 'Completed' THEN DonorName END) as uniqueDonors
             FROM donations
             WHERE CampaignId = ? AND IsDeleted = FALSE`,
            [campaignId]
        );
        return rows[0];
    }

    // Get recent donations for a campaign
    static async getRecent(campaignId, limit = 10) {
        const [rows] = await db.execute(
            `SELECT DonorName, Amount, DonationDate, DonationType
             FROM donations
             WHERE CampaignId = ? AND Status = 'Completed' AND IsDeleted = FALSE
             ORDER BY DonationDate DESC
             LIMIT ?`,
            [campaignId, limit]
        );
        return rows;
    }

    // Get top donations for a campaign
    static async getTop(campaignId, limit = 5) {
        const [rows] = await db.execute(
            `SELECT DonorName, Amount, DonationDate, DonationType
             FROM donations
             WHERE CampaignId = ? AND Status = 'Completed' AND IsDeleted = FALSE
             ORDER BY Amount DESC
             LIMIT ?`,
            [campaignId, limit]
        );
        return rows;
    }
}

module.exports = Donation;
