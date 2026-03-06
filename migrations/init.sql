-- Create database if not exists
CREATE DATABASE IF NOT EXISTS auth_org_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE auth_org_db;

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    RoleId INT AUTO_INCREMENT PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL,
    RoleCode VARCHAR(20) NOT NULL UNIQUE,
    Description TEXT,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted BOOLEAN DEFAULT FALSE,
    INDEX idx_role_code (RoleCode),
    INDEX idx_role_active (IsActive)
);

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    OrganizationId INT AUTO_INCREMENT PRIMARY KEY,
    OrganizationName VARCHAR(100) NOT NULL,
    OrganizationType ENUM('Orphanage', 'School', 'NGO', 'Shelter Home') NOT NULL,
    RegistrationNumber VARCHAR(50),
    ContactPersonName VARCHAR(100),
    ContactMobile VARCHAR(15),
    ContactEmail VARCHAR(100),
    Address TEXT,
    City VARCHAR(50),
    State VARCHAR(50),
    Pincode VARCHAR(10),
    TotalBeneficiaries INT DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted BOOLEAN DEFAULT FALSE,
    INDEX idx_org_type (OrganizationType),
    INDEX idx_org_city (City),
    INDEX idx_org_active (IsActive)
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    UserId INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    MobileNumber VARCHAR(15),
    Email VARCHAR(100) NOT NULL UNIQUE,
    Username VARCHAR(50) UNIQUE,
    Password VARCHAR(255),
    RoleId INT,
    OrganizationId INT,
    Status ENUM('Active', 'Inactive', 'Blocked') DEFAULT 'Inactive',
    IsEmailVerified BOOLEAN DEFAULT FALSE,
    GoogleId VARCHAR(100),
    LastLogin DATETIME,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedBy INT,
    FOREIGN KEY (RoleId) REFERENCES roles(RoleId) ON DELETE SET NULL,
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId) ON DELETE SET NULL,
    INDEX idx_user_email (Email),
    INDEX idx_user_status (Status),
    INDEX idx_user_role (RoleId),
    INDEX idx_user_org (OrganizationId),
    INDEX idx_user_google (GoogleId)
);

-- OTP Tokens Table
CREATE TABLE IF NOT EXISTS otp_tokens (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    OTP VARCHAR(6) NOT NULL,
    Purpose ENUM('email_verification', 'password_reset') DEFAULT 'email_verification',
    ExpiresAt DATETIME NOT NULL,
    IsUsed BOOLEAN DEFAULT FALSE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_email (Email),
    INDEX idx_otp_expiry (ExpiresAt)
);

-- Refresh Tokens Table (for JWT refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    Token VARCHAR(500) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES users(UserId) ON DELETE CASCADE,
    INDEX idx_refresh_user (UserId),
    INDEX idx_refresh_token (Token(255))
);

-- Insert default roles
INSERT INTO roles (RoleName, RoleCode, Description, IsActive, CreatedDate) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full system access with all permissions', TRUE, NOW()),
('Admin', 'ADMIN', 'Administrative access to manage users, roles, and organizations', TRUE, NOW()),
('Organization Admin', 'ORG_ADMIN', 'Can manage their own organization and its members', TRUE, NOW()),
('Staff', 'STAFF', 'Staff member with limited access', TRUE, NOW()),
('Volunteer', 'VOLUNTEER', 'Volunteer with basic access', TRUE, NOW()),
('Sponsor', 'SPONSOR', 'Sponsor with view access to sponsored organizations', TRUE, NOW())
ON DUPLICATE KEY UPDATE RoleName = VALUES(RoleName);
