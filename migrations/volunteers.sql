-- =====================================================
-- Volunteer System Tables
-- =====================================================

USE auth_org_db;

-- Admin-defined form fields per project
CREATE TABLE IF NOT EXISTS volunteer_form_fields (
    FieldId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    FieldName VARCHAR(100) NOT NULL,
    FieldLabel VARCHAR(255) NOT NULL,
    FieldType ENUM('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'NUMBER', 'DATE') DEFAULT 'TEXT',
    Options JSON,
    IsRequired BOOLEAN DEFAULT FALSE,
    DisplayOrder INT DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Volunteer applications
CREATE TABLE IF NOT EXISTS volunteer_applications (
    ApplicationId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    UserId INT NOT NULL,
    Status ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
    Message TEXT,
    Skills TEXT,
    Availability TEXT,
    PreviousExperience TEXT,
    ReviewedBy INT,
    ReviewedDate DATETIME,
    AdminNotes TEXT,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (UserId) REFERENCES users(UserId),
    FOREIGN KEY (ReviewedBy) REFERENCES users(UserId),
    UNIQUE KEY unique_project_user (ProjectId, UserId)
);

-- Responses to custom form fields
CREATE TABLE IF NOT EXISTS volunteer_application_responses (
    ResponseId INT AUTO_INCREMENT PRIMARY KEY,
    ApplicationId INT NOT NULL,
    FieldId INT NOT NULL,
    ResponseValue TEXT,
    FOREIGN KEY (ApplicationId) REFERENCES volunteer_applications(ApplicationId) ON DELETE CASCADE,
    FOREIGN KEY (FieldId) REFERENCES volunteer_form_fields(FieldId) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_vol_fields_project ON volunteer_form_fields(ProjectId);
CREATE INDEX idx_vol_apps_project ON volunteer_applications(ProjectId);
CREATE INDEX idx_vol_apps_user ON volunteer_applications(UserId);
CREATE INDEX idx_vol_apps_status ON volunteer_applications(Status);
CREATE INDEX idx_vol_responses_app ON volunteer_application_responses(ApplicationId);
CREATE INDEX idx_vol_responses_field ON volunteer_application_responses(FieldId);
