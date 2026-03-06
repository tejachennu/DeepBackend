const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./index');
const { query, queryOne } = require('./database');

// Configure Google OAuth Strategy (only if credentials are available)
if (config.google.clientId && config.google.clientSecret) {
    passport.use(new GoogleStrategy({
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const googleId = profile.id;
            const fullName = profile.displayName;

            // Check if user exists with this Google ID
            let user = await queryOne(
                'SELECT * FROM users WHERE GoogleId = ?',
                [googleId]
            );

            if (!user) {
                // Check if user exists with this email
                user = await queryOne(
                    'SELECT * FROM users WHERE Email = ?',
                    [email]
                );

                if (user) {
                    // Link Google account to existing user
                    await query(
                        'UPDATE users SET GoogleId = ?, IsEmailVerified = TRUE WHERE UserId = ?',
                        [googleId, user.UserId]
                    );
                    user.GoogleId = googleId;
                    user.IsEmailVerified = true;
                } else {
                    // Create new user with default role (Staff)
                    const defaultRole = await queryOne(
                        "SELECT RoleId FROM roles WHERE RoleCode = 'STAFF' AND IsActive = TRUE"
                    );

                    const result = await query(
                        `INSERT INTO users (FullName, Email, GoogleId, RoleId, Status, IsEmailVerified, CreatedDate) 
                     VALUES (?, ?, ?, ?, 'Active', TRUE, NOW())`,
                        [fullName, email, googleId, defaultRole?.RoleId || null]
                    );

                    user = await queryOne(
                        'SELECT * FROM users WHERE UserId = ?',
                        [result.insertId]
                    );
                }
            }

            // Update last login
            await query(
                'UPDATE users SET LastLogin = NOW() WHERE UserId = ?',
                [user.UserId]
            );

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

    // Serialize user
    passport.serializeUser((user, done) => {
        done(null, user.UserId);
    });

    // Deserialize user
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await queryOne(
                'SELECT * FROM users WHERE UserId = ?',
                [id]
            );
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

} else {
    console.warn('⚠️  Google OAuth credentials not found. Google login will be unavailable.');
}

module.exports = passport;
