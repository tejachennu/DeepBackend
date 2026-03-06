-- =====================================================
-- Beneficiaries & Sponsorship System
-- =====================================================

-- Beneficiaries Table
CREATE TABLE IF NOT EXISTS beneficiaries (
    BeneficiaryId INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    DateOfBirth DATE,
    Gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    Category ENUM('Child', 'Woman', 'OldAge', 'Other') NOT NULL,
    PhotoUrl VARCHAR(500),
    Address TEXT,
    City VARCHAR(50),
    State VARCHAR(50),
    Description TEXT,
    OrganizationId INT NOT NULL,
    AddedBy INT,
    Status ENUM('Active', 'Inactive') DEFAULT 'Active',
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId) ON DELETE CASCADE,
    FOREIGN KEY (AddedBy) REFERENCES users(UserId) ON DELETE SET NULL,
    INDEX idx_ben_org (OrganizationId),
    INDEX idx_ben_category (Category),
    INDEX idx_ben_status (Status)
);

-- Beneficiary Documents Table
CREATE TABLE IF NOT EXISTS beneficiary_documents (
    DocumentId INT AUTO_INCREMENT PRIMARY KEY,
    BeneficiaryId INT NOT NULL,
    DocumentName VARCHAR(100),
    DocumentUrl VARCHAR(500) NOT NULL,
    DocumentType VARCHAR(50) DEFAULT 'Other',
    UploadedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BeneficiaryId) REFERENCES beneficiaries(BeneficiaryId) ON DELETE CASCADE,
    FOREIGN KEY (UploadedBy) REFERENCES users(UserId) ON DELETE SET NULL,
    INDEX idx_doc_ben (BeneficiaryId)
);

-- Sponsorship Requests Table
CREATE TABLE IF NOT EXISTS sponsorship_requests (
    RequestId INT AUTO_INCREMENT PRIMARY KEY,
    BeneficiaryId INT NOT NULL,
    OrganizationId INT NOT NULL,
    RequestedBy INT,
    ExpectedAmount DECIMAL(10, 2) DEFAULT 50000.00,
    AmountFrequency ENUM('Yearly', 'Monthly', 'OneTime') DEFAULT 'Yearly',
    Purpose TEXT,
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    ReviewedBy INT,
    ReviewedDate DATETIME,
    ReviewNotes TEXT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (BeneficiaryId) REFERENCES beneficiaries(BeneficiaryId) ON DELETE CASCADE,
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId) ON DELETE CASCADE,
    FOREIGN KEY (RequestedBy) REFERENCES users(UserId) ON DELETE SET NULL,
    FOREIGN KEY (ReviewedBy) REFERENCES users(UserId) ON DELETE SET NULL,
    INDEX idx_spon_status (Status),
    INDEX idx_spon_org (OrganizationId),
    INDEX idx_spon_ben (BeneficiaryId)
);
