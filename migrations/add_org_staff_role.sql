-- Add ORG_STAFF role
INSERT INTO roles (RoleName, RoleCode, Description, IsActive, CreatedDate)
SELECT 'Organization Staff', 'ORG_STAFF', 'Organization staff who can add beneficiaries, upload documents, and manage sponsorship requests', TRUE, NOW()
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE RoleCode = 'ORG_STAFF');
