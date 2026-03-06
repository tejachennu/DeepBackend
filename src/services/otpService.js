const crypto = require('crypto');
const { query, queryOne } = require('../config/database');
const config = require('../config');

// Generate 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// Create and store OTP
const createOTP = async (email, purpose = 'email_verification') => {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Invalidate any existing unused OTPs for this email and purpose
    await query(
        'UPDATE otp_tokens SET IsUsed = TRUE WHERE Email = ? AND Purpose = ? AND IsUsed = FALSE',
        [email, purpose]
    );

    // Create new OTP
    await query(
        'INSERT INTO otp_tokens (Email, OTP, Purpose, ExpiresAt) VALUES (?, ?, ?, ?)',
        [email, otp, purpose, expiresAt]
    );

    return otp;
};

// Verify OTP
const verifyOTP = async (email, otp, purpose = 'email_verification') => {
    const otpRecord = await queryOne(
        `SELECT * FROM otp_tokens 
         WHERE Email = ? AND OTP = ? AND Purpose = ? AND IsUsed = FALSE AND ExpiresAt > NOW()
         ORDER BY CreatedAt DESC LIMIT 1`,
        [email, otp, purpose]
    );

    if (!otpRecord) {
        return { valid: false, message: 'Invalid or expired OTP' };
    }

    // Mark OTP as used
    await query(
        'UPDATE otp_tokens SET IsUsed = TRUE WHERE Id = ?',
        [otpRecord.Id]
    );

    return { valid: true, message: 'OTP verified successfully' };
};

// Check if OTP exists and not expired (without marking as used)
const checkOTPExists = async (email, purpose = 'email_verification') => {
    const otpRecord = await queryOne(
        `SELECT * FROM otp_tokens 
         WHERE Email = ? AND Purpose = ? AND IsUsed = FALSE AND ExpiresAt > NOW()
         ORDER BY CreatedAt DESC LIMIT 1`,
        [email, purpose]
    );

    return !!otpRecord;
};

// Clean up expired OTPs (can be called periodically)
const cleanupExpiredOTPs = async () => {
    const result = await query(
        'DELETE FROM otp_tokens WHERE ExpiresAt < NOW() OR IsUsed = TRUE'
    );
    return result.affectedRows;
};

module.exports = {
    generateOTP,
    createOTP,
    verifyOTP,
    checkOTPExists,
    cleanupExpiredOTPs
};
