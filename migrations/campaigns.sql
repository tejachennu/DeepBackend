-- =====================================================
-- Campaigns and Donations Tables
-- =====================================================

USE auth_org_db;

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    CampaignId INT AUTO_INCREMENT PRIMARY KEY,
    ProjectId INT NOT NULL,
    CampaignName VARCHAR(255) NOT NULL,
    CampaignCode VARCHAR(50) UNIQUE,
    CampaignType ENUM('FUNDRAISING', 'AWARENESS', 'EVENT') DEFAULT 'FUNDRAISING',
    ImageUrls JSON,  -- Array of image URLs
    VideoUrls JSON,  -- Array of video URLs
    Description TEXT,
    TargetAmount DECIMAL(15, 2) DEFAULT 0,
    CollectedAmount DECIMAL(15, 2) DEFAULT 0,
    StartDate DATE,
    EndDate DATE,
    CampaignStatus ENUM('Draft', 'Active', 'Paused', 'Completed', 'Cancelled') DEFAULT 'Draft',
    IsPublic BOOLEAN DEFAULT TRUE,
    RazorpayEnabled BOOLEAN DEFAULT TRUE,
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Donations Table
CREATE TABLE IF NOT EXISTS donations (
    DonationId INT AUTO_INCREMENT PRIMARY KEY,
    CampaignId INT NOT NULL,
    ProjectId INT,
    
    -- Donor Information
    DonorType ENUM('INDIVIDUAL', 'ORGANIZATION') DEFAULT 'INDIVIDUAL',
    DonorName VARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(20),
    EmailId VARCHAR(255),
    PanNumber VARCHAR(20),  -- For 80G certificate
    Address TEXT,
    
    -- Donation Details
    DonationType ENUM('CASH', 'BANK', 'UPI', 'CHEQUE', 'IN_KIND', 'RAZORPAY') DEFAULT 'RAZORPAY',
    Amount DECIMAL(15, 2) NOT NULL,
    Currency VARCHAR(10) DEFAULT 'INR',
    
    -- Payment Details
    PaymentMode VARCHAR(50),  -- Online/Offline
    TransactionReference VARCHAR(255),
    RazorpayOrderId VARCHAR(255),
    RazorpayPaymentId VARCHAR(255),
    RazorpaySignature VARCHAR(500),
    
    -- Offline Payment Details
    ChequeNumber VARCHAR(50),
    ChequeDate DATE,
    BankName VARCHAR(100),
    BranchName VARCHAR(100),
    
    -- Other Details
    DonationDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    Purpose VARCHAR(500),
    ReceiptNumber VARCHAR(50),
    Is80GApplicable BOOLEAN DEFAULT FALSE,
    Certificate80GUrl VARCHAR(500),
    
    -- Status
    Status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Refunded') DEFAULT 'Pending',
    Remarks TEXT,
    
    -- Audit
    IsDeleted BOOLEAN DEFAULT FALSE,
    CreatedBy INT,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy INT,
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (CampaignId) REFERENCES campaigns(CampaignId),
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId),
    FOREIGN KEY (CreatedBy) REFERENCES users(UserId),
    FOREIGN KEY (UpdatedBy) REFERENCES users(UserId)
);

-- Indexes
CREATE INDEX idx_campaigns_project ON campaigns(ProjectId);
CREATE INDEX idx_campaigns_status ON campaigns(CampaignStatus);
CREATE INDEX idx_campaigns_type ON campaigns(CampaignType);
CREATE INDEX idx_campaigns_code ON campaigns(CampaignCode);
CREATE INDEX idx_donations_campaign ON donations(CampaignId);
CREATE INDEX idx_donations_status ON donations(Status);
CREATE INDEX idx_donations_type ON donations(DonationType);
CREATE INDEX idx_donations_razorpay ON donations(RazorpayOrderId);
CREATE INDEX idx_donations_date ON donations(DonationDate);
