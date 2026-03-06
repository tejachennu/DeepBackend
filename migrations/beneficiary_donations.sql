-- =====================================================
-- Beneficiary Help Donation Tables
-- =====================================================

USE auth_org_db;

-- Beneficiary Donations Table
CREATE TABLE IF NOT EXISTS beneficiary_donations (
    BeneficiaryDonationId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    OrganizationId INT,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    DonationType ENUM('CASH', 'IN_KIND', 'GOODS', 'SERVICES', 'FOOD', 'CLOTHING', 'MEDICAL', 'OTHER') DEFAULT 'CASH',
    Amount DECIMAL(15, 2) DEFAULT 0,
    Currency VARCHAR(10) DEFAULT 'INR',
    ReceivedItemName VARCHAR(255),
    ReceivedItemDescription TEXT,
    DonationDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Status ENUM('Pending', 'Distributed', 'InProgress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    BeneficiaryName VARCHAR(255),
    BeneficiaryContact VARCHAR(50),
    BeneficiaryAddress TEXT,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Beneficiary Donation Media Table (for images and videos)
CREATE TABLE IF NOT EXISTS beneficiary_donation_media (
    MediaId INT AUTO_INCREMENT PRIMARY KEY,
    BeneficiaryDonationId INT NOT NULL,
    MediaType ENUM('IMAGE', 'VIDEO') NOT NULL,
    MediaUrl VARCHAR(500) NOT NULL,
    ThumbnailUrl VARCHAR(500),
    FileName VARCHAR(255),
    FileSize INT,
    MimeType VARCHAR(100),
    Caption VARCHAR(500),
    DisplayOrder INT DEFAULT 0,
    IsDeleted BOOLEAN DEFAULT FALSE,
    UploadedBy INT,
    UploadedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BeneficiaryDonationId) REFERENCES beneficiary_donations(BeneficiaryDonationId),
    FOREIGN KEY (UploadedBy) REFERENCES users(UserId)
);

-- Indexes
CREATE INDEX idx_ben_donations_project ON beneficiary_donations(ProjectId);
CREATE INDEX idx_ben_donations_org ON beneficiary_donations(OrganizationId);
CREATE INDEX idx_ben_donations_status ON beneficiary_donations(Status);
CREATE INDEX idx_ben_donations_type ON beneficiary_donations(DonationType);
CREATE INDEX idx_ben_donations_date ON beneficiary_donations(DonationDate);
CREATE INDEX idx_ben_donation_media ON beneficiary_donation_media(BeneficiaryDonationId);
