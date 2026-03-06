-- =====================================================
-- Device Management Tables
-- =====================================================

USE auth_org_db;

CREATE TABLE IF NOT EXISTS user_devices (
    DeviceId INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    DeviceUniqueId VARCHAR(255) NOT NULL,
    DeviceName VARCHAR(255),
    Platform VARCHAR(50),
    PushToken VARCHAR(500),
    IsActive BOOLEAN DEFAULT TRUE,
    LastLoginAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES users(UserId),
    INDEX idx_device_user (UserId),
    INDEX idx_device_unique (DeviceUniqueId),
    UNIQUE KEY uk_user_device (UserId, DeviceUniqueId)
);
