-- API Logs Table - Tracks all API requests and responses
USE auth_org_db;

CREATE TABLE IF NOT EXISTS api_logs (
    LogId INT AUTO_INCREMENT PRIMARY KEY,
    RequestId VARCHAR(36) NOT NULL,
    Method VARCHAR(10) NOT NULL,
    Endpoint VARCHAR(500) NOT NULL,
    StatusCode INT,
    ResponseTime INT COMMENT 'Response time in milliseconds',
    UserId INT NULL,
    UserEmail VARCHAR(100) NULL,
    IpAddress VARCHAR(45),
    UserAgent VARCHAR(500),
    RequestBody JSON NULL,
    ResponseBody JSON NULL,
    ErrorMessage TEXT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_log_request_id (RequestId),
    INDEX idx_log_user (UserId),
    INDEX idx_log_endpoint (Endpoint(255)),
    INDEX idx_log_status (StatusCode),
    INDEX idx_log_created (CreatedAt),
    INDEX idx_log_method (Method),
    
    FOREIGN KEY (UserId) REFERENCES users(UserId) ON DELETE SET NULL
);
