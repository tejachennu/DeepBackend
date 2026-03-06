const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { createOTP, verifyOTP } = require('../services/otpService');
const { sendOTPEmail, sendWelcomeEmail } = require('../services/emailService');
const config = require('../config');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(config.google.clientId);

// Signup with email/password
const signup = async (req, res) => {
    try {
        const { email, password, fullName, username, mobileNumber, role } = req.body;

        // Check if user already exists
        const existingUser = await queryOne(
            'SELECT * FROM users WHERE Email = ? OR (Username = ? AND Username IS NOT NULL)',
            [email, username || null]
        );

        if (existingUser) {
            if (existingUser.Email === email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered. Please login or use a different email.'
                });
            }
            if (existingUser.Username === username) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken. Please choose a different username.'
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Determine role: use explicit ID 7 for standard 'User', fallback to fetching VOLUNTEER/SPONSOR
        let roleIdToAssign = 7; // Defaulting to RoleId 7 (User) based on requirement
        if (role) {
            const roleCode = (role.toLowerCase() === 'sponsor') ? 'SPONSOR' : 'VOLUNTEER';
            const fetchedRole = await queryOne(
                "SELECT RoleId FROM roles WHERE RoleCode = ? AND IsActive = TRUE",
                [roleCode]
            );
            if (fetchedRole) {
                roleIdToAssign = fetchedRole.RoleId;
            }
        }

        // Create user
        const result = await query(
            `INSERT INTO users (FullName, Email, Username, MobileNumber, Password, RoleId, Status, CreatedDate) 
             VALUES (?, ?, ?, ?, ?, ?, 'Inactive', NOW())`,
            [fullName, email, username || null, mobileNumber || null, hashedPassword, roleIdToAssign]
        );

        // Generate and send OTP
        const otp = await createOTP(email, 'email_verification');
        await sendOTPEmail(email, otp, 'email_verification');

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for OTP verification.',
            data: {
                userId: result.insertId,
                email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
};

// Verify OTP for email verification
const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Verify OTP
        const result = await verifyOTP(email, otp, 'email_verification');

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        // Update user status and email verification
        const updateResult = await query(
            "UPDATE users SET IsEmailVerified = TRUE, Status = 'Active' WHERE Email = ?",
            [email]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Get updated user
        const user = await queryOne(
            `SELECT u.*, r.RoleName, r.RoleCode 
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             WHERE u.Email = ?`,
            [email]
        );

        // Generate token
        const token = generateToken(user);

        // Send welcome email
        await sendWelcomeEmail(email, user.FullName);

        res.json({
            success: true,
            message: 'Email verified successfully.',
            data: {
                token,
                user: {
                    userId: user.UserId,
                    email: user.Email,
                    fullName: user.FullName,
                    role: user.RoleName
                }
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const user = await queryOne(
            'SELECT * FROM users WHERE Email = ?',
            [email]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (user.IsEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified.'
            });
        }

        // Generate and send new OTP
        const otp = await createOTP(email, 'email_verification');
        await sendOTPEmail(email, otp, 'email_verification');

        res.json({
            success: true,
            message: 'OTP sent successfully. Please check your email.'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP. Please try again.'
        });
    }
};

// Login with email/password
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user with role
        const user = await queryOne(
            `SELECT u.*, r.RoleName, r.RoleCode 
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             WHERE u.Email = ?`,
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if user has password (not Google-only account)
        if (!user.Password) {
            return res.status(401).json({
                success: false,
                message: 'This account uses Google login. Please login with Google.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.Password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check user status
        if (user.Status === 'Blocked') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Please contact support.'
            });
        }

        // Check email verification
        if (!user.IsEmailVerified) {
            // Resend OTP
            const otp = await createOTP(email, 'email_verification');
            await sendOTPEmail(email, otp, 'email_verification');

            return res.status(403).json({
                success: false,
                message: 'Email not verified. A new OTP has been sent to your email.',
                requiresVerification: true
            });
        }

        // Update last login
        await query(
            'UPDATE users SET LastLogin = NOW() WHERE UserId = ?',
            [user.UserId]
        );

        // Generate token
        const token = generateToken(user);

        // Store device info if provided
        const { deviceId, deviceName, platform, pushToken, appVersion } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required to login.'
            });
        }

        if (deviceId) {
            try {
                // Store in user_devices (existing table)
                await query(
                    `INSERT INTO user_devices (UserId, DeviceUniqueId, DeviceName, Platform, PushToken, IsActive, LastLoginAt)
                     VALUES (?, ?, ?, ?, ?, TRUE, NOW())
                     ON DUPLICATE KEY UPDATE DeviceName = VALUES(DeviceName), Platform = VALUES(Platform),
                     PushToken = COALESCE(VALUES(PushToken), PushToken), IsActive = TRUE, LastLoginAt = NOW()`,
                    [user.UserId, deviceId, deviceName || null, platform || null, pushToken || null]
                );

                // Also store in app_devices (new table)
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
                await query(
                    `INSERT INTO app_devices (UserId, DeviceId, AppVersion, Platform, DeviceName, IpAddress, IsActive, LastLoginAt)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
                     ON DUPLICATE KEY UPDATE AppVersion = VALUES(AppVersion), Platform = VALUES(Platform),
                     DeviceName = VALUES(DeviceName), IpAddress = VALUES(IpAddress), IsActive = TRUE, LastLoginAt = NOW()`,
                    [user.UserId, deviceId, appVersion || null, platform || null, deviceName || null, ip]
                );
            } catch (devErr) {
                console.warn('Device storage warning:', devErr.message);
            }
        }

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                token,
                user: {
                    userId: user.UserId,
                    email: user.Email,
                    fullName: user.FullName,
                    username: user.Username,
                    role: user.RoleName,
                    roleCode: user.RoleCode,
                    organizationId: user.OrganizationId,
                    profilePhotoUrl: user.ProfilePhotoUrl || null
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};

// Google Login with ID Token (for Mobile/Client-side flow)
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required.'
            });
        }

        // Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: [
                config.google.clientId,
                process.env.GOOGLE_ANDROID_CLIENT_ID,
                process.env.GOOGLE_IOS_CLIENT_ID,
                process.env.GOOGLE_WEB_CLIENT_ID
            ]
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId, picture } = payload;

        // Check if user exists
        let user = await queryOne(
            'SELECT * FROM users WHERE GoogleId = ?',
            [googleId]
        );

        if (!user) {
            // Check by email
            user = await queryOne(
                'SELECT * FROM users WHERE Email = ?',
                [email]
            );

            if (user) {
                // Link Google account
                await query(
                    'UPDATE users SET GoogleId = ?, IsEmailVerified = TRUE, Status = ? WHERE UserId = ?',
                    [googleId, 'Active', user.UserId]
                );
                user.GoogleId = googleId;
                user.IsEmailVerified = true;
            } else {
                // Create new user
                const defaultRole = await queryOne(
                    "SELECT RoleId FROM roles WHERE RoleCode = 'VOLUNTEER' AND IsActive = TRUE"
                );

                const result = await query(
                    `INSERT INTO users (FullName, Email, GoogleId, RoleId, Status, IsEmailVerified, CreatedDate) 
                     VALUES (?, ?, ?, ?, 'Active', TRUE, NOW())`,
                    [name, email, googleId, defaultRole?.RoleId || null]
                );

                user = await queryOne(
                    'SELECT * FROM users WHERE UserId = ?',
                    [result.insertId]
                );
            }
        }

        // Check if blocked
        if (user.Status === 'Blocked') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked.'
            });
        }

        // Update last login
        await query(
            'UPDATE users SET LastLogin = NOW() WHERE UserId = ?',
            [user.UserId]
        );

        // Get full user details with role
        const fullUser = await queryOne(
            `SELECT u.*, r.RoleName, r.RoleCode 
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             WHERE u.UserId = ?`,
            [user.UserId]
        );

        // Generate token
        const jwtToken = generateToken(fullUser);

        // Store device info if provided
        const { deviceId, deviceName, platform, pushToken } = req.body;
        if (deviceId) {
            try {
                await query(
                    `INSERT INTO user_devices (UserId, DeviceUniqueId, DeviceName, Platform, PushToken, IsActive, LastLoginAt)
                     VALUES (?, ?, ?, ?, ?, TRUE, NOW())
                     ON DUPLICATE KEY UPDATE DeviceName = VALUES(DeviceName), Platform = VALUES(Platform),
                     PushToken = COALESCE(VALUES(PushToken), PushToken), IsActive = TRUE, LastLoginAt = NOW()`,
                    [fullUser.UserId, deviceId, deviceName || null, platform || null, pushToken || null]
                );
            } catch (devErr) {
                console.warn('Device storage warning (google):', devErr.message);
            }
        }

        res.json({
            success: true,
            message: 'Google login successful.',
            data: {
                token: jwtToken,
                user: {
                    userId: fullUser.UserId,
                    email: fullUser.Email,
                    fullName: fullUser.FullName,
                    username: fullUser.Username,
                    role: fullUser.RoleName,
                    roleCode: fullUser.RoleCode,
                    organizationId: fullUser.OrganizationId,
                    picture: picture
                }
            }
        });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid Google token.'
        });
    }
};

// Google OAuth callback handler
const googleCallback = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
        }

        // Get user with role info
        const fullUser = await queryOne(
            `SELECT u.*, r.RoleName, r.RoleCode 
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             WHERE u.UserId = ?`,
            [user.UserId]
        );

        // Generate token
        const token = generateToken(fullUser);

        // Redirect to frontend with token
        res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('Google callback error:', error);
        res.redirect(`${config.frontendUrl}/login?error=google_auth_failed`);
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await queryOne(
            `SELECT u.UserId, u.FullName, u.Email, u.Username, u.MobileNumber, 
                    u.Status, u.IsEmailVerified, u.LastLogin, u.CreatedDate,
                    u.ProfilePhotoUrl,
                    r.RoleName, r.RoleCode,
                    o.OrganizationName, o.OrganizationType
             FROM users u 
             LEFT JOIN roles r ON u.RoleId = r.RoleId 
             LEFT JOIN organizations o ON u.OrganizationId = o.OrganizationId
             WHERE u.UserId = ?`,
            [req.user.UserId]
        );

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile.'
        });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { fullName, mobileNumber, profilePhotoUrl } = req.body;
        const updates = [];
        const values = [];

        if (fullName) { updates.push('FullName = ?'); values.push(fullName); }
        if (mobileNumber !== undefined) { updates.push('MobileNumber = ?'); values.push(mobileNumber); }
        if (profilePhotoUrl !== undefined) { updates.push('ProfilePhotoUrl = ?'); values.push(profilePhotoUrl); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(req.user.UserId);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE UserId = ?`, values);

        // Return updated profile
        const user = await queryOne(
            `SELECT u.UserId, u.FullName, u.Email, u.Username, u.MobileNumber, u.ProfilePhotoUrl,
                    r.RoleName, r.RoleCode, o.OrganizationName
             FROM users u LEFT JOIN roles r ON u.RoleId = r.RoleId
             LEFT JOIN organizations o ON u.OrganizationId = o.OrganizationId
             WHERE u.UserId = ?`,
            [req.user.UserId]
        );

        res.json({ success: true, message: 'Profile updated successfully.', data: user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Old and new passwords are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }

        const user = await queryOne('SELECT Password FROM users WHERE UserId = ?', [req.user.UserId]);
        if (!user || !user.Password) {
            return res.status(400).json({ success: false, message: 'Cannot change password for Google-only accounts.' });
        }

        const isValid = await bcrypt.compare(oldPassword, user.Password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await query('UPDATE users SET Password = ? WHERE UserId = ?', [hashed, req.user.UserId]);

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
};

// Check device - verify if deviceId is registered and active
const checkDevice = async (req, res) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId) {
            return res.status(400).json({ success: false, message: 'Device ID is required.' });
        }

        const device = await queryOne(
            'SELECT * FROM app_devices WHERE UserId = ? AND DeviceId = ? AND IsActive = TRUE',
            [req.user.UserId, deviceId]
        );

        if (!device) {
            return res.json({ success: true, data: { isRegistered: false } });
        }

        res.json({ success: true, data: { isRegistered: true, device } });
    } catch (error) {
        console.error('Check device error:', error);
        res.status(500).json({ success: false, message: 'Failed to check device.' });
    }
};

// Get latest app version
const getAppVersion = async (req, res) => {
    try {
        const { platform } = req.query;
        const plt = platform || 'android';

        const version = await queryOne(
            'SELECT * FROM app_versions WHERE Platform = ? AND IsActive = TRUE ORDER BY CreatedDate DESC LIMIT 1',
            [plt]
        );

        if (!version) {
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: {
                version: version.Version,
                appLink: version.AppLink,
                isForceUpdate: !!version.IsForceUpdate,
                releaseNotes: version.ReleaseNotes
            }
        });
    } catch (error) {
        console.error('Get app version error:', error);
        res.status(500).json({ success: false, message: 'Failed to get app version.' });
    }
};

// Forgot password - send OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await queryOne(
            'SELECT * FROM users WHERE Email = ?',
            [email]
        );

        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If an account exists with this email, an OTP will be sent.'
            });
        }

        const otp = await createOTP(email, 'password_reset');
        await sendOTPEmail(email, otp, 'password_reset');

        res.json({
            success: true,
            message: 'If an account exists with this email, an OTP will be sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request. Please try again.'
        });
    }
};

// Reset password with OTP
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Verify OTP
        const result = await verifyOTP(email, otp, 'password_reset');

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await query(
            'UPDATE users SET Password = ? WHERE Email = ?',
            [hashedPassword, email]
        );

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.'
        });
    }
};

// Logout - remove all devices
const logout = async (req, res) => {
    try {
        await query(
            'DELETE FROM user_devices WHERE UserId = ?',
            [req.user.UserId]
        );
        res.json({ success: true, message: 'Logged out successfully from all devices.' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Logout failed.' });
    }
};

// Logout from all devices
const logoutAll = async (req, res) => {
    try {
        await query(
            'UPDATE user_devices SET IsActive = FALSE WHERE UserId = ?',
            [req.user.UserId]
        );
        res.json({ success: true, message: 'Logged out from all devices.' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ success: false, message: 'Logout failed.' });
    }
};

// Update push token
const updatePushToken = async (req, res) => {
    try {
        const { deviceId, pushToken } = req.body;
        if (!deviceId || !pushToken) {
            return res.status(400).json({ success: false, message: 'Device ID and push token required.' });
        }
        await query(
            'UPDATE user_devices SET PushToken = ? WHERE UserId = ? AND DeviceUniqueId = ?',
            [pushToken, req.user.UserId, deviceId]
        );
        res.json({ success: true, message: 'Push token updated.' });
    } catch (error) {
        console.error('Update push token error:', error);
        res.status(500).json({ success: false, message: 'Failed to update push token.' });
    }
};

module.exports = {
    signup,
    verifyEmailOTP,
    resendOTP,
    login,
    googleLogin,
    googleCallback,
    getProfile,
    updateProfile,
    changePassword,
    checkDevice,
    getAppVersion,
    forgotPassword,
    resetPassword,
    logout,
    logoutAll,
    updatePushToken
};
