-- ============================================================================
-- Migration: Add TestDefinition Link to TestResult
-- Purpose: Link test results to master test definitions
-- Date: 2026-02-09
-- ============================================================================

-- Step 1: Add new column for testDefinitionId
ALTER TABLE test_results 
ADD COLUMN test_definition_id UUID;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_test_results_test_definition_id 
ON test_results(test_definition_id);

-- Step 3: Add foreign key constraint
ALTER TABLE test_results
ADD CONSTRAINT fk_test_results_test_definition
FOREIGN KEY (test_definition_id) 
REFERENCES test_definitions(id) 
ON DELETE SET NULL;

-- Step 4: Add index on test_definitions parameterName for faster matching
CREATE INDEX IF NOT EXISTS idx_test_definitions_parameter_name 
ON test_definitions(parameter_name);

-- Step 5: Create helper function to match test results to definitions
-- This function attempts to match existing test results to test definitions
CREATE OR REPLACE FUNCTION match_test_results_to_definitions()
RETURNS INTEGER AS $$
DECLARE
  matched_count INTEGER := 0;
BEGIN
  -- Match by exact parameter name (case-insensitive)
  UPDATE test_results tr
  SET test_definition_id = td.id
  FROM test_definitions td
  WHERE LOWER(TRIM(tr.parameter_name)) = LOWER(TRIM(td.parameter_name))
    AND tr.test_definition_id IS NULL;
  
  GET DIAGNOSTICS matched_count = ROW_COUNT;
  
  RETURN matched_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Run the matching function to link existing data
-- Uncomment the line below to auto-match existing test results:
-- SELECT match_test_results_to_definitions();

-- ============================================================================
-- NOTES:
-- - Existing test results will have NULL test_definition_id (backward compatible)
-- - New uploads should populate test_definition_id using the matching service
-- - Run match_test_results_to_definitions() to link historical data
-- ============================================================================
