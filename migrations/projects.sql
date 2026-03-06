-- =====================================================
-- Projects and Project Spends Tables
-- =====================================================

USE auth_org_db;

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    ProjectId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectName VARCHAR(255) NOT NULL,
    ProjectTitle VARCHAR(255),
    ProjectDescription TEXT,
    Objective TEXT,
    BannerUrl VARCHAR(500),  -- Azure Blob URL
    StartDate DATE,
    StartTime TIME,
    EndDate DATE,
    EndTime TIME,
    Location VARCHAR(500),   -- Maps pin point / coordinates
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    Status ENUM('Planned', 'Ongoing', 'Completed') DEFAULT 'Planned',
    OrganizationId INT,
    IsActive BOOLEAN DEFAULT TRUE,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (OrganizationId) REFERENCES organizations(OrganizationId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Project Spends Table
CREATE TABLE IF NOT EXISTS project_spends (
    ProjectSpendId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    ExpenseName VARCHAR(255) NOT NULL,
    ExpenseDescription TEXT,
    Amount DECIMAL(15, 2) NOT NULL,
    PaidWithTrustAmount BOOLEAN DEFAULT FALSE,
    PaymentMode ENUM('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other') DEFAULT 'Cash',
    PaidTo VARCHAR(255),
    BillImageUrl VARCHAR(500),  -- Azure Blob URL
    BillDate DATE,
    SpentDate DATE,
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    ApprovedBy INT,
    ApprovedDate DATETIME,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (ApprovedBy) REFERENCES users(UserId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Indexes for better query performance
CREATE INDEX idx_projects_org ON projects(OrganizationId);
CREATE INDEX idx_projects_status ON projects(Status);
CREATE INDEX idx_projects_dates ON projects(StartDate, EndDate);
CREATE INDEX idx_spends_project ON project_spends(ProjectId);
CREATE INDEX idx_spends_status ON project_spends(Status);
CREATE INDEX idx_spends_dates ON project_spends(SpentDate, BillDate);
