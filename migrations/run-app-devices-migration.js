require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('Running app_devices_version migration...');

        // Add ProfilePhotoUrl column to users
        try {
            await connection.execute(
                "ALTER TABLE users ADD COLUMN ProfilePhotoUrl VARCHAR(500) NULL"
            );
            console.log('✅ Added ProfilePhotoUrl column to users');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⏭️  ProfilePhotoUrl column already exists');
            } else {
                console.warn('⚠️ ProfilePhotoUrl:', e.message);
            }
        }

        // Create app_devices table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS app_devices (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                UserId INT NOT NULL,
                DeviceId VARCHAR(255) NOT NULL COMMENT 'UUID generated on client',
                AppVersion VARCHAR(50) DEFAULT NULL,
                Platform VARCHAR(50) DEFAULT NULL COMMENT 'ios, android, web',
                DeviceName VARCHAR(255) DEFAULT NULL,
                IpAddress VARCHAR(100) DEFAULT NULL,
                Location VARCHAR(255) DEFAULT NULL,
                IsActive BOOLEAN DEFAULT TRUE,
                LastLoginAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserId) REFERENCES users(UserId) ON DELETE CASCADE,
                UNIQUE KEY uk_app_user_device (UserId, DeviceId),
                INDEX idx_app_device_user (UserId),
                INDEX idx_app_device_id (DeviceId)
            )
        `);
        console.log('✅ Created app_devices table');

        // Create app_versions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS app_versions (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Platform VARCHAR(50) NOT NULL COMMENT 'android, ios, web',
                Version VARCHAR(50) NOT NULL,
                AppLink VARCHAR(500) NOT NULL,
                IsForceUpdate BOOLEAN DEFAULT FALSE,
                ReleaseNotes TEXT DEFAULT NULL,
                IsActive BOOLEAN DEFAULT TRUE,
                CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_app_version_platform (Platform)
            )
        `);
        console.log('✅ Created app_versions table');

        // Insert default version records
        await connection.execute(`
            INSERT IGNORE INTO app_versions (Platform, Version, AppLink, IsForceUpdate, IsActive) VALUES
            ('android', '1.0.0', 'https://play.google.com/store/apps/details?id=com.tejachennu.deep', FALSE, TRUE),
            ('ios', '1.0.0', 'https://apps.apple.com/app/deep', FALSE, TRUE),
            ('web', '1.0.0', 'https://deep.app', FALSE, TRUE)
        `);
        console.log('✅ Inserted default version records');

        console.log('\n🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
