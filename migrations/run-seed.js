/**
 * Database Seed Script
 * Creates all tables, roles, organizations, and test users
 * Run with: node migrations/run-seed.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
    host: process.env.DB_HOST || '72.60.202.106',
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'App@1234',
    database: process.env.DB_NAME || 'deep',
    multipleStatements: true
};

const TEST_PASSWORD = 'Test@1234';

async function runSeed() {
    let connection;

    try {
        console.log('🔌 Connecting to MySQL database...');
        console.log(`   Host: ${config.host}`);
        console.log(`   Database: ${config.database}`);
        console.log(`   User: ${config.user}\n`);

        connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully!\n');

        // Drop existing tables
        console.log('🗑️  Dropping existing tables...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS refresh_tokens, otp_tokens, users, organizations, roles');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Tables dropped!\n');

        // Create Roles table
        console.log('📋 Creating roles table...');
        await connection.query(`
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
            )
        `);

        // Create Organizations table
        console.log('🏢 Creating organizations table...');
        await connection.query(`
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
            )
        `);

        // Create Users table
        console.log('👥 Creating users table...');
        await connection.query(`
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
            )
        `);

        // Create OTP Tokens table
        console.log('🔐 Creating otp_tokens table...');
        await connection.query(`
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
            )
        `);

        // Create Refresh Tokens table
        console.log('🔄 Creating refresh_tokens table...');
        await connection.query(`
            CREATE TABLE refresh_tokens (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                UserId INT NOT NULL,
                Token VARCHAR(500) NOT NULL,
                ExpiresAt DATETIME NOT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (UserId) REFERENCES users(UserId) ON DELETE CASCADE,
                INDEX idx_refresh_user (UserId),
                INDEX idx_refresh_token (Token(255))
            )
        `);
        console.log('✅ All tables created!\n');

        // Insert Roles
        console.log('👔 Inserting roles...');
        const roles = [
            ['Super Admin', 'SUPER_ADMIN', 'Full system access with all permissions'],
            ['Admin', 'ADMIN', 'Administrative access to manage users, roles, and organizations'],
            ['Organization Admin', 'ORG_ADMIN', 'Can manage their own organization and its members'],
            ['Staff', 'STAFF', 'Staff member with limited access'],
            ['Volunteer', 'VOLUNTEER', 'Volunteer with basic access'],
            ['Sponsor', 'SPONSOR', 'Sponsor with view access to sponsored organizations']
        ];

        for (const role of roles) {
            await connection.query(
                'INSERT INTO roles (RoleName, RoleCode, Description, IsActive) VALUES (?, ?, ?, TRUE)',
                role
            );
        }
        console.log('✅ 6 roles inserted!\n');

        // Insert Organizations
        console.log('🏢 Inserting sample organizations...');
        await connection.query(`
            INSERT INTO organizations (OrganizationName, OrganizationType, RegistrationNumber, ContactPersonName, ContactMobile, ContactEmail, Address, City, State, Pincode, TotalBeneficiaries, IsActive) VALUES
            ('Hope Foundation', 'NGO', 'NGO-2024-001', 'Jane Smith', '9876543210', 'contact@hopefoundation.org', '123 Charity Lane', 'Mumbai', 'Maharashtra', '400001', 150, TRUE),
            ('Sunshine School', 'School', 'SCH-2024-002', 'Robert Johnson', '9876543211', 'admin@sunshineschool.org', '456 Education Road', 'Delhi', 'Delhi', '110001', 500, TRUE)
        `);
        console.log('✅ 2 organizations inserted!\n');

        // Hash password
        console.log('🔑 Generating password hash...');
        const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
        console.log(`   Password: ${TEST_PASSWORD}`);
        console.log(`   Hash: ${hashedPassword}\n`);

        // Insert Users
        console.log('👥 Inserting test users...');
        const users = [
            ['Super Admin User', 'superadmin@test.com', 'superadmin', '9000000001', hashedPassword, 1, null],
            ['Admin User', 'admin@test.com', 'admin', '9000000002', hashedPassword, 2, null],
            ['Org Admin User', 'orgadmin@test.com', 'orgadmin', '9000000003', hashedPassword, 3, 1],
            ['Staff User', 'staff@test.com', 'staff', '9000000004', hashedPassword, 4, 1],
            ['Volunteer User', 'volunteer@test.com', 'volunteer', '9000000005', hashedPassword, 5, 2],
            ['Sponsor User', 'sponsor@test.com', 'sponsor', '9000000006', hashedPassword, 6, null]
        ];

        for (const user of users) {
            await connection.query(
                `INSERT INTO users (FullName, Email, Username, MobileNumber, Password, RoleId, OrganizationId, Status, IsEmailVerified) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', TRUE)`,
                user
            );
        }
        console.log('✅ 6 test users inserted!\n');

        // Summary
        console.log('═══════════════════════════════════════════════════');
        console.log('           🎉 DATABASE SEEDED SUCCESSFULLY!         ');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('📋 Test User Credentials:');
        console.log('   Password for ALL users: Test@1234\n');

        console.log('   ┌─────────────────────┬────────────────────────┐');
        console.log('   │ Role                │ Email                  │');
        console.log('   ├─────────────────────┼────────────────────────┤');
        console.log('   │ Super Admin         │ superadmin@test.com    │');
        console.log('   │ Admin               │ admin@test.com         │');
        console.log('   │ Organization Admin  │ orgadmin@test.com      │');
        console.log('   │ Staff               │ staff@test.com         │');
        console.log('   │ Volunteer           │ volunteer@test.com     │');
        console.log('   │ Sponsor             │ sponsor@test.com       │');
        console.log('   └─────────────────────┴────────────────────────┘\n');

        console.log('🚀 You can now start the server with: npm run dev');
        console.log('📖 API Docs: http://localhost:3000/api-docs\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Check your database credentials in .env file');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runSeed();
