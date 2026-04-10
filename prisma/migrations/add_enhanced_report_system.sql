-- Migration: Add Enhanced Report System with Auto-Classification
-- This migration adds LabCenter, TestMaster, TestParameter tables
-- and updates Report and TestResult tables with new fields

-- Add LabCenter table
CREATE TABLE IF NOT EXISTS "lab_centers" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "centerName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "lab_centers_centerName_idx" ON "lab_centers"("centerName");

-- Add TestMaster table
CREATE TABLE IF NOT EXISTS "test_master" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "testName" TEXT NOT NULL UNIQUE,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "test_master_category_subcategory_idx" ON "test_master"("category", "subcategory");

-- Add TestParameter table
CREATE TABLE IF NOT EXISTS "test_parameters" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "testId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "unit" TEXT,
    "normalMin" DOUBLE PRECISION,
    "normalMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("testId") REFERENCES "test_master"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "test_parameters_testId_idx" ON "test_parameters"("testId");
CREATE INDEX IF NOT EXISTS "test_parameters_parameterName_idx" ON "test_parameters"("parameterName");

-- Alter Reports table (add new columns if they don't exist)
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "centerId" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'Lab Reports';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "filePath" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "fileName" TEXT;

-- Add foreign key for centerId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reports_centerId_fkey'
    ) THEN
        ALTER TABLE "reports" ADD CONSTRAINT "reports_centerId_fkey" 
        FOREIGN KEY ("centerId") REFERENCES "lab_centers"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add indexes for reports
CREATE INDEX IF NOT EXISTS "reports_userId_category_subcategory_idx" ON "reports"("userId", "category", "subcategory");
CREATE INDEX IF NOT EXISTS "reports_reportDate_idx" ON "reports"("reportDate");

-- Alter TestResults table (add parameterId)
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "parameterId" TEXT;

-- Add foreign key for parameterId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'test_results_parameterId_fkey'
    ) THEN
        ALTER TABLE "test_results" ADD CONSTRAINT "test_results_parameterId_fkey" 
        FOREIGN KEY ("parameterId") REFERENCES "test_parameters"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for reportId
CREATE INDEX IF NOT EXISTS "test_results_reportId_idx" ON "test_results"("reportId");

-- Alter HealthSummary table (add new columns)
ALTER TABLE "health_summaries" ADD COLUMN IF NOT EXISTS "keyIssues" TEXT;
ALTER TABLE "health_summaries" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;

-- Add reportId foreign key if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'health_summaries_reportId_fkey'
    ) THEN
        ALTER TABLE "health_summaries" ADD CONSTRAINT "health_summaries_reportId_fkey" 
        FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Add index for health summaries
CREATE INDEX IF NOT EXISTS "health_summaries_userId_reportId_idx" ON "health_summaries"("userId", "reportId");

-- Insert default lab centers
INSERT INTO "lab_centers" ("id", "centerName", "type", "location", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'Default Lab Center', 'lab', 'Unknown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Default Imaging Center', 'scan', 'Unknown', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert default test master data (Blood Tests)
INSERT INTO "test_master" ("id", "testName", "category", "subcategory", "description", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid(), 'Complete Blood Count', 'Lab Reports', 'Blood Tests', 'Comprehensive blood analysis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Thyroid Profile', 'Lab Reports', 'Thyroid Tests', 'TSH, T3, T4 analysis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Lipid Profile', 'Lab Reports', 'Heart / Cardiac Tests', 'Cholesterol analysis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Liver Function Test', 'Lab Reports', 'Liver Function Tests', 'SGOT, SGPT, Bilirubin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Kidney Function Test', 'Lab Reports', 'Kidney / Renal Tests', 'Urea, Creatinine, Uric Acid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (testName) DO NOTHING;

COMMIT;
