-- =====================================================
-- Make ProjectId optional in campaigns table
-- =====================================================

USE auth_org_db;

-- Drop foreign key constraint first
ALTER TABLE campaigns DROP FOREIGN KEY campaigns_ibfk_1;

-- Make ProjectId nullable
ALTER TABLE campaigns MODIFY COLUMN ProjectId INT NULL;

-- Re-add foreign key constraint
ALTER TABLE campaigns ADD CONSTRAINT campaigns_ibfk_1 
    FOREIGN KEY (ProjectId) REFERENCES projects(ProjectId);
