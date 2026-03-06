-- =====================================================
-- App Devices & Version Management Tables
-- =====================================================

USE auth_org_db;

-- Add ProfilePhotoUrl to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ProfilePhotoUrl VARCHAR(500) NULL;

-- App Devices table - stores device info on every login
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
    UNIQUE KEY uk_user_device (UserId, DeviceId),
    INDEX idx_app_device_user (UserId),
    INDEX idx_app_device_id (DeviceId)
);

-- App Versions table - admin can set latest version & download link
CREATE TABLE IF NOT EXISTS app_versions (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Platform VARCHAR(50) NOT NULL COMMENT 'android, ios, web',
    Version VARCHAR(50) NOT NULL COMMENT 'e.g. 1.0.1',
    AppLink VARCHAR(500) NOT NULL COMMENT 'download/store link',
    IsForceUpdate BOOLEAN DEFAULT FALSE,
    ReleaseNotes TEXT DEFAULT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_app_version_platform (Platform)
);

-- Insert default version record
INSERT INTO app_versions (Platform, Version, AppLink, IsForceUpdate, IsActive) VALUES
('android', '1.0.0', 'https://play.google.com/store/apps/details?id=com.tejachennu.deep', FALSE, TRUE),
('ios', '1.0.0', 'https://apps.apple.com/app/deep', FALSE, TRUE),
('web', '1.0.0', 'https://deep.app', FALSE, TRUE)
ON DUPLICATE KEY UPDATE Version = VALUES(Version);
