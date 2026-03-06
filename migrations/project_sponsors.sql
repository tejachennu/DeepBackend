-- =====================================================
-- Project Sponsors Tables
-- =====================================================

USE auth_org_db;

-- Project Sponsors Table
CREATE TABLE IF NOT EXISTS project_sponsors (
    ProjectSponsorId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    SponsorType ENUM('INDIVIDUAL', 'ORGANIZATION') DEFAULT 'INDIVIDUAL',
    SponsorId INT,  -- Links to users table for INDIVIDUAL
    OrganizationId INT,  -- Links to organizations table for ORGANIZATION
    
    -- Sponsor Details (for external sponsors not in system)
    SponsorName VARCHAR(255),
    SponsorEmail VARCHAR(255),
    SponsorPhone VARCHAR(50),
    SponsorAddress TEXT,
    SponsorWebsite VARCHAR(500),
    SponsorLogo VARCHAR(500),
    
    -- Sponsorship Details
    Purpose TEXT,
    SponsorshipType ENUM('FINANCIAL', 'IN_KIND', 'SERVICES', 'MATERIALS', 'EQUIPMENT', 'VENUE', 'MEDIA', 'OTHER') DEFAULT 'FINANCIAL',
    Amount DECIMAL(15, 2) DEFAULT 0,
    Currency VARCHAR(10) DEFAULT 'INR',
    Description TEXT,
    
    -- Date Range
    StartDate DATE,
    EndDate DATE,
    
    -- Status
    Status ENUM('Pending', 'Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    IsPublic BOOLEAN DEFAULT TRUE,  -- Show on public page
    DisplayOrder INT DEFAULT 0,
    
    -- Audit
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (SponsorId) REFERENCES users(UserId),
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Project Sponsor Media Table (images and videos)
CREATE TABLE IF NOT EXISTS project_sponsor_media (
    MediaId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectSponsorId INT NOT NULL,
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
    FOREIGN KEY (ProjectSponsorId) REFERENCES project_sponsors(ProjectSponsorId),
    FOREIGN KEY (UploadedBy) REFERENCES users(UserId)
);

-- Indexes
CREATE INDEX idx_sponsors_project ON project_sponsors(ProjectId);
CREATE INDEX idx_sponsors_type ON project_sponsors(SponsorType);
CREATE INDEX idx_sponsors_status ON project_sponsors(Status);
CREATE INDEX idx_sponsors_org ON project_sponsors(OrganizationId);
CREATE INDEX idx_sponsor_media ON project_sponsor_media(ProjectSponsorId);
