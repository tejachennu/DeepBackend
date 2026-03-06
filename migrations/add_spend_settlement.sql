-- Migration: Add own money and settlement tracking to project_spends
-- Run this migration on your database

-- Add new columns for own money tracking and settlement
ALTER TABLE project_spends 
ADD COLUMN IF NOT EXISTS PaidWithOwnMoney BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS IsSettled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS SettledBy INT NULL,
ADD COLUMN IF NOT EXISTS SettledDate DATETIME NULL,
ADD COLUMN IF NOT EXISTS SettlementNotes TEXT NULL,
ADD COLUMN IF NOT EXISTS SettlementAmount DECIMAL(12,2) NULL;

-- Add index for faster settlement queries
CREATE INDEX IF NOT EXISTS idx_spend_own_money ON project_spends(PaidWithOwnMoney);
CREATE INDEX IF NOT EXISTS idx_spend_settled ON project_spends(IsSettled);
