-- =====================================================
-- Camps and Camp Media Tables
-- =====================================================

USE auth_org_db;

-- Camps Table
CREATE TABLE IF NOT EXISTS camps (
    CampId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    CampName VARCHAR(255) NOT NULL,
    CampDescription TEXT,
    CampType VARCHAR(100),
    CampAddress TEXT,
    CampPincode VARCHAR(10),
    CampState VARCHAR(100),
    CampCity VARCHAR(100),
    PeopleExpected INT DEFAULT 0,
    PeopleAttended INT DEFAULT 0,
    RegistrationFormLink VARCHAR(500),
    ExcelDataLink VARCHAR(500),
    CampStartDate DATETIME,
    CampEndDate DATETIME,
    CampStatus ENUM('Planned', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Planned',
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Camp Media Table (for images and videos)
CREATE TABLE IF NOT EXISTS camp_media (
    MediaId INT AUTO_INCREMENT PRIMARY KEY,
    CampId INT NOT NULL,
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
    FOREIGN KEY (CampId) REFERENCES camps(CampId),
    FOREIGN KEY (UploadedBy) REFERENCES users(UserId)
);

-- Indexes
CREATE INDEX idx_camps_project ON camps(ProjectId);
CREATE INDEX idx_camps_status ON camps(CampStatus);
CREATE INDEX idx_camps_dates ON camps(CampStartDate, CampEndDate);
CREATE INDEX idx_camps_state ON camps(CampState);
CREATE INDEX idx_camp_media_camp ON camp_media(CampId);
CREATE INDEX idx_camp_media_type ON camp_media(MediaType);
