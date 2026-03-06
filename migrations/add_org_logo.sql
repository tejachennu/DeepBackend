-- Add OrgLogo column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS OrgLogo VARCHAR(500) NULL AFTER TotalBeneficiaries;
