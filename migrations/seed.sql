-- =====================================================
-- Complete Database Setup with Test Users
-- Password for all test users: Test@1234
-- =====================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS auth_org_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE auth_org_db;

-- Drop tables if exist (for fresh setup)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS otp_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS roles;

-- Roles Table
CREATE TABLE roles (
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
CREATE TABLE organizations (
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
CREATE TABLE users (
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
CREATE TABLE otp_tokens (
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

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    Token VARCHAR(500) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES users(UserId) ON DELETE CASCADE,
    INDEX idx_refresh_user (UserId),
    INDEX idx_refresh_token (Token(255))
);

-- =====================================================
-- Insert Roles
-- =====================================================
INSERT INTO roles (RoleName, RoleCode, Description, IsActive, CreatedDate) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full system access with all permissions', TRUE, NOW()),
('Admin', 'ADMIN', 'Administrative access to manage users, roles, and organizations', TRUE, NOW()),
('Organization Admin', 'ORG_ADMIN', 'Can manage their own organization and its members', TRUE, NOW()),
('Staff', 'STAFF', 'Staff member with limited access', TRUE, NOW()),
('Volunteer', 'VOLUNTEER', 'Volunteer with basic access', TRUE, NOW()),
('Sponsor', 'SPONSOR', 'Sponsor with view access to sponsored organizations', TRUE, NOW());

-- =====================================================
-- Insert Sample Organization
-- =====================================================
INSERT INTO organizations (OrganizationName, OrganizationType, RegistrationNumber, ContactPersonName, ContactMobile, ContactEmail, Address, City, State, Pincode, TotalBeneficiaries, IsActive) VALUES
('Hope Foundation', 'NGO', 'NGO-2024-001', 'Jane Smith', '9876543210', 'contact@hopefoundation.org', '123 Charity Lane', 'Mumbai', 'Maharashtra', '400001', 150, TRUE),
('Sunshine School', 'School', 'SCH-2024-002', 'Robert Johnson', '9876543211', 'admin@sunshineschool.org', '456 Education Road', 'Delhi', 'Delhi', '110001', 500, TRUE);

-- =====================================================
-- Insert Test Users (Password: Test@1234)
-- Bcrypt hash of 'Test@1234' with 12 rounds
-- =====================================================
-- Password hash generated using bcrypt: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.

INSERT INTO users (FullName, Email, Username, MobileNumber, Password, RoleId, OrganizationId, Status, IsEmailVerified, CreatedDate) VALUES
-- Super Admin
('Super Admin User', 'superadmin@test.com', 'superadmin', '9000000001', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 1, NULL, 'Active', TRUE, NOW()),

-- Admin
('Admin User', 'admin@test.com', 'admin', '9000000002', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 2, NULL, 'Active', TRUE, NOW()),

-- Organization Admin (assigned to Hope Foundation)
('Org Admin User', 'orgadmin@test.com', 'orgadmin', '9000000003', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 3, 1, 'Active', TRUE, NOW()),

-- Staff (assigned to Hope Foundation)
('Staff User', 'staff@test.com', 'staff', '9000000004', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 4, 1, 'Active', TRUE, NOW()),

-- Volunteer (assigned to Sunshine School)
('Volunteer User', 'volunteer@test.com', 'volunteer', '9000000005', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 5, 2, 'Active', TRUE, NOW()),

-- Sponsor
('Sponsor User', 'sponsor@test.com', 'sponsor', '9000000006', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VLkxB5V5j5WHQW.', 6, NULL, 'Active', TRUE, NOW());

-- =====================================================
-- Verification Queries
-- =====================================================
SELECT '✅ Tables Created Successfully!' AS Status;
SELECT CONCAT('📊 Roles: ', COUNT(*)) AS Count FROM roles;
SELECT CONCAT('🏢 Organizations: ', COUNT(*)) AS Count FROM organizations;
SELECT CONCAT('👥 Users: ', COUNT(*)) AS Count FROM users;

SELECT '======================================' AS '';
SELECT '📋 Test User Credentials' AS '';
SELECT '======================================' AS '';
SELECT 'Password for ALL users: Test@1234' AS '';
SELECT '' AS '';
SELECT CONCAT(r.RoleName, ': ', u.Email) AS 'Email by Role'
FROM users u JOIN roles r ON u.RoleId = r.RoleId ORDER BY r.RoleId;
