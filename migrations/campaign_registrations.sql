-- =====================================================
-- Camp Registration System (Dynamic Forms)
-- Mirrors volunteer registration pattern but for camps
-- =====================================================

USE deep;

-- Admin-defined form fields per camp
CREATE TABLE IF NOT EXISTS camp_registration_fields (
    FieldId INT AUTO_INCREMENT PRIMARY KEY,
    CampId INT NOT NULL,
    FieldName VARCHAR(100) NOT NULL,
    FieldLabel VARCHAR(255) NOT NULL,
    FieldType ENUM('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'NUMBER', 'DATE', 'FILE') DEFAULT 'TEXT',
    Options JSON,
    IsRequired BOOLEAN DEFAULT FALSE,
    DisplayOrder INT DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (CampId) REFERENCES camps(CampId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId)
);

-- Public registrations (all fields are dynamic, no static fields)
CREATE TABLE IF NOT EXISTS camp_registrations (
    RegistrationId INT AUTO_INCREMENT PRIMARY KEY,
    CampId INT NOT NULL,
    Status ENUM('Active', 'Cancelled') DEFAULT 'Active',
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (CampId) REFERENCES camps(CampId)
);

-- Responses to dynamic form fields
CREATE TABLE IF NOT EXISTS camp_registration_responses (
    ResponseId INT AUTO_INCREMENT PRIMARY KEY,
    RegistrationId INT NOT NULL,
    FieldId INT NOT NULL,
    ResponseValue TEXT,
    FOREIGN KEY (RegistrationId) REFERENCES camp_registrations(RegistrationId) ON DELETE CASCADE,
    FOREIGN KEY (FieldId) REFERENCES camp_registration_fields(FieldId) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_campreg_fields_camp ON camp_registration_fields(CampId);
CREATE INDEX idx_campreg_camp ON camp_registrations(CampId);
CREATE INDEX idx_campreg_status ON camp_registrations(Status);
CREATE INDEX idx_campreg_responses_reg ON camp_registration_responses(RegistrationId);
CREATE INDEX idx_campreg_responses_field ON camp_registration_responses(FieldId);
