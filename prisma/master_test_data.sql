-- ============================================================================
-- Master Test Definitions - SQL Insert Statements
-- Generated: 2026-02-05
-- Total Tests: 94
-- Database: PostgreSQL
-- ============================================================================

-- Create the test_definitions table (if not using Prisma migrations)
CREATE TABLE IF NOT EXISTS test_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    normal_min_value DECIMAL(10, 3),
    normal_max_value DECIMAL(10, 3),
    risk_level_logic TEXT NOT NULL,
    is_qualitative BOOLEAN DEFAULT FALSE,
    gender_specific TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_definitions_category ON test_definitions(category_name);
CREATE INDEX IF NOT EXISTS idx_test_definitions_test_id ON test_definitions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_definitions_test_name ON test_definitions(test_name);

-- Clear existing data (optional - comment out if preserving data)
-- TRUNCATE TABLE test_definitions CASCADE;

-- ============================================================================
-- BLOOD TESTS (15 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('BT001', 'Blood Tests', 'Hemoglobin', 'Hemoglobin', 'g/dL', 12.0, 17.0, '{"low":"< 12.0","normal":"12.0 - 17.0","high":"> 17.0"}', FALSE, '{"male":{"min":13.5,"max":17.5},"female":{"min":12.0,"max":15.5}}'),
('BT002', 'Blood Tests', 'RBC Count', 'RBC Count', 'million cells/µL', 4.5, 5.9, '{"low":"< 4.5","normal":"4.5 - 5.9","high":"> 5.9"}', FALSE, '{"male":{"min":4.7,"max":6.1},"female":{"min":4.2,"max":5.4}}'),
('BT003', 'Blood Tests', 'WBC Count', 'WBC Count', 'cells/µL', 4000, 11000, '{"low":"< 4000","normal":"4000 - 11000","high":"> 11000"}', FALSE, NULL),
('BT004', 'Blood Tests', 'Platelet Count', 'Platelet Count', 'lakhs/µL', 1.5, 4.5, '{"low":"< 1.5","normal":"1.5 - 4.5","high":"> 4.5"}', FALSE, NULL),
('BT005', 'Blood Tests', 'Hematocrit', 'Hematocrit', '%', 38.0, 52.0, '{"low":"< 38.0","normal":"38.0 - 52.0","high":"> 52.0"}', FALSE, '{"male":{"min":40.0,"max":54.0},"female":{"min":36.0,"max":48.0}}'),
('BT006', 'Blood Tests', 'MCV', 'MCV', 'fL', 80.0, 100.0, '{"low":"< 80.0","normal":"80.0 - 100.0","high":"> 100.0"}', FALSE, NULL),
('BT007', 'Blood Tests', 'MCH', 'MCH', 'pg', 27.0, 33.0, '{"low":"< 27.0","normal":"27.0 - 33.0","high":"> 33.0"}', FALSE, NULL),
('BT008', 'Blood Tests', 'MCHC', 'MCHC', 'g/dL', 32.0, 36.0, '{"low":"< 32.0","normal":"32.0 - 36.0","high":"> 36.0"}', FALSE, NULL),
('BT009', 'Blood Tests', 'ESR', 'ESR', 'mm/hr', 0, 20, '{"low":"N/A","normal":"0 - 20","high":"> 20"}', FALSE, '{"male":{"min":0,"max":15},"female":{"min":0,"max":20}}'),
('BT010', 'Blood Tests', 'PCV', 'PCV', '%', 36.0, 48.0, '{"low":"< 36.0","normal":"36.0 - 48.0","high":"> 48.0"}', FALSE, NULL),
('BT011', 'Blood Tests', 'Neutrophils', 'Neutrophils', '%', 40.0, 75.0, '{"low":"< 40.0","normal":"40.0 - 75.0","high":"> 75.0"}', FALSE, NULL),
('BT012', 'Blood Tests', 'Lymphocytes', 'Lymphocytes', '%', 20.0, 45.0, '{"low":"< 20.0","normal":"20.0 - 45.0","high":"> 45.0"}', FALSE, NULL),
('BT013', 'Blood Tests', 'Monocytes', 'Monocytes', '%', 2.0, 10.0, '{"low":"< 2.0","normal":"2.0 - 10.0","high":"> 10.0"}', FALSE, NULL),
('BT014', 'Blood Tests', 'Eosinophils', 'Eosinophils', '%', 1.0, 6.0, '{"low":"< 1.0","normal":"1.0 - 6.0","high":"> 6.0"}', FALSE, NULL),
('BT015', 'Blood Tests', 'Basophils', 'Basophils', '%', 0, 2.0, '{"low":"N/A","normal":"0 - 2.0","high":"> 2.0"}', FALSE, NULL);

-- ============================================================================
-- URINE TESTS (11 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('UT001', 'Urine Tests', 'Urine pH', 'pH', '', 4.5, 8.0, '{"low":"< 4.5","normal":"4.5 - 8.0","high":"> 8.0"}', FALSE, NULL),
('UT002', 'Urine Tests', 'Specific Gravity', 'Specific Gravity', '', 1.005, 1.030, '{"low":"< 1.005","normal":"1.005 - 1.030","high":"> 1.030"}', FALSE, NULL),
('UT003', 'Urine Tests', 'Protein', 'Protein', 'mg/dL', 0, 8, '{"low":"N/A","normal":"0 - 8","high":"> 8"}', FALSE, NULL),
('UT004', 'Urine Tests', 'Glucose', 'Glucose', 'mg/dL', 0, 15, '{"low":"N/A","normal":"0 - 15","high":"> 15"}', FALSE, NULL),
('UT005', 'Urine Tests', 'Ketones', 'Ketones', '', NULL, NULL, '{"low":"N/A","normal":"Negative","high":"Positive"}', TRUE, NULL),
('UT006', 'Urine Tests', 'RBC in Urine', 'RBC', 'cells/HPF', 0, 3, '{"low":"N/A","normal":"0 - 3","high":"> 3"}', FALSE, NULL),
('UT007', 'Urine Tests', 'WBC in Urine', 'WBC', 'cells/HPF', 0, 5, '{"low":"N/A","normal":"0 - 5","high":"> 5"}', FALSE, NULL),
('UT008', 'Urine Tests', 'Casts', 'Casts', '/LPF', 0, 2, '{"low":"N/A","normal":"0 - 2","high":"> 2"}', FALSE, NULL),
('UT009', 'Urine Tests', 'Crystals', 'Crystals', '', NULL, NULL, '{"low":"N/A","normal":"Absent or Few","high":"Many"}', TRUE, NULL),
('UT010', 'Urine Tests', 'Bilirubin', 'Bilirubin', '', NULL, NULL, '{"low":"N/A","normal":"Negative","high":"Positive"}', TRUE, NULL),
('UT011', 'Urine Tests', 'Urobilinogen', 'Urobilinogen', 'mg/dL', 0.1, 1.0, '{"low":"< 0.1","normal":"0.1 - 1.0","high":"> 1.0"}', FALSE, NULL);

-- ============================================================================
-- HEART / CARDIAC TESTS (7 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('CT001', 'Heart / Cardiac Tests', 'Total Cholesterol', 'Total Cholesterol', 'mg/dL', 125, 200, '{"low":"< 125","normal":"125 - 200","high":"> 200"}', FALSE, NULL),
('CT002', 'Heart / Cardiac Tests', 'HDL', 'HDL Cholesterol', 'mg/dL', 40, 100, '{"low":"< 40","normal":"40 - 100","high":"> 100"}', FALSE, NULL),
('CT003', 'Heart / Cardiac Tests', 'LDL', 'LDL Cholesterol', 'mg/dL', 0, 100, '{"low":"N/A","normal":"< 100","high":"> 100"}', FALSE, NULL),
('CT004', 'Heart / Cardiac Tests', 'VLDL', 'VLDL Cholesterol', 'mg/dL', 2, 30, '{"low":"< 2","normal":"2 - 30","high":"> 30"}', FALSE, NULL),
('CT005', 'Heart / Cardiac Tests', 'Triglycerides', 'Triglycerides', 'mg/dL', 0, 150, '{"low":"N/A","normal":"< 150","high":"> 150"}', FALSE, NULL),
('CT006', 'Heart / Cardiac Tests', 'Troponin', 'Troponin I', 'ng/mL', 0, 0.04, '{"low":"N/A","normal":"< 0.04","high":"> 0.04"}', FALSE, NULL),
('CT007', 'Heart / Cardiac Tests', 'CK-MB', 'CK-MB', 'U/L', 0, 25, '{"low":"N/A","normal":"< 25","high":"> 25"}', FALSE, NULL);

-- ============================================================================
-- LUNG / RESPIRATORY TESTS (4 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('LT001', 'Lung / Respiratory Tests', 'Oxygen Saturation', 'SpO2', '%', 95, 100, '{"low":"< 95","normal":"95 - 100","high":"N/A"}', FALSE, NULL),
('LT002', 'Lung / Respiratory Tests', 'Respiratory Rate', 'Respiratory Rate', 'breaths/min', 12, 20, '{"low":"< 12","normal":"12 - 20","high":"> 20"}', FALSE, NULL),
('LT003', 'Lung / Respiratory Tests', 'FEV1', 'FEV1', 'L', 2.5, 4.5, '{"low":"< 2.5","normal":"2.5 - 4.5","high":"> 4.5"}', FALSE, NULL),
('LT004', 'Lung / Respiratory Tests', 'FVC', 'FVC', 'L', 3.0, 5.5, '{"low":"< 3.0","normal":"3.0 - 5.5","high":"> 5.5"}', FALSE, NULL);

-- ============================================================================
-- BRAIN & NERVOUS SYSTEM TESTS (4 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('NT001', 'Brain & Nervous System Tests', 'Vitamin B12', 'Vitamin B12', 'pg/mL', 200, 900, '{"low":"< 200","normal":"200 - 900","high":"> 900"}', FALSE, NULL),
('NT002', 'Brain & Nervous System Tests', 'Folate', 'Folate', 'ng/mL', 2.7, 17.0, '{"low":"< 2.7","normal":"2.7 - 17.0","high":"> 17.0"}', FALSE, NULL),
('NT003', 'Brain & Nervous System Tests', 'EEG Result', 'EEG', '', NULL, NULL, '{"low":"N/A","normal":"Normal","high":"Abnormal"}', TRUE, NULL),
('NT004', 'Brain & Nervous System Tests', 'CSF Glucose', 'CSF Glucose', 'mg/dL', 40, 70, '{"low":"< 40","normal":"40 - 70","high":"> 70"}', FALSE, NULL);

-- ============================================================================
-- BONE & VITAMIN TESTS (4 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('VT001', 'Bone & Vitamin Tests', 'Vitamin D', 'Vitamin D', 'ng/mL', 30, 100, '{"low":"< 30","normal":"30 - 100","high":"> 100"}', FALSE, NULL),
('VT002', 'Bone & Vitamin Tests', 'Calcium', 'Calcium', 'mg/dL', 8.5, 10.5, '{"low":"< 8.5","normal":"8.5 - 10.5","high":"> 10.5"}', FALSE, NULL),
('VT003', 'Bone & Vitamin Tests', 'Phosphorus', 'Phosphorus', 'mg/dL', 2.5, 4.5, '{"low":"< 2.5","normal":"2.5 - 4.5","high":"> 4.5"}', FALSE, NULL),
('VT004', 'Bone & Vitamin Tests', 'Magnesium', 'Magnesium', 'mg/dL', 1.7, 2.2, '{"low":"< 1.7","normal":"1.7 - 2.2","high":"> 2.2"}', FALSE, NULL);

-- ============================================================================
-- INFECTION & IMMUNITY TESTS (6 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('IT001', 'Infection & Immunity Tests', 'CRP', 'C-Reactive Protein', 'mg/L', 0, 3, '{"low":"N/A","normal":"< 3","high":"> 3"}', FALSE, NULL),
('IT002', 'Infection & Immunity Tests', 'HIV Test', 'HIV', '', NULL, NULL, '{"low":"N/A","normal":"Non-Reactive / Negative","high":"Reactive / Positive"}', TRUE, NULL),
('IT003', 'Infection & Immunity Tests', 'HBsAg', 'HBsAg', '', NULL, NULL, '{"low":"N/A","normal":"Non-Reactive / Negative","high":"Reactive / Positive"}', TRUE, NULL),
('IT004', 'Infection & Immunity Tests', 'Widal Test', 'Widal Test', '', NULL, NULL, '{"low":"N/A","normal":"Negative (< 1:80)","high":"Positive (>= 1:80)"}', TRUE, NULL),
('IT005', 'Infection & Immunity Tests', 'Dengue NS1', 'Dengue NS1 Antigen', '', NULL, NULL, '{"low":"N/A","normal":"Negative","high":"Positive"}', TRUE, NULL),
('IT006', 'Infection & Immunity Tests', 'COVID Antibody', 'COVID-19 Antibody', '', NULL, NULL, '{"low":"N/A","normal":"Negative / Non-Reactive","high":"Positive / Reactive"}', TRUE, NULL);

-- ============================================================================
-- CANCER RELATED TESTS (4 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('CAN001', 'Cancer Related Tests', 'PSA', 'Prostate Specific Antigen', 'ng/mL', 0, 4.0, '{"low":"N/A","normal":"< 4.0","high":"> 4.0"}', FALSE, NULL),
('CAN002', 'Cancer Related Tests', 'CA-125', 'Cancer Antigen 125', 'U/mL', 0, 35, '{"low":"N/A","normal":"< 35","high":"> 35"}', FALSE, NULL),
('CAN003', 'Cancer Related Tests', 'AFP', 'Alpha-Fetoprotein', 'ng/mL', 0, 10, '{"low":"N/A","normal":"< 10","high":"> 10"}', FALSE, NULL),
('CAN004', 'Cancer Related Tests', 'CEA', 'Carcinoembryonic Antigen', 'ng/mL', 0, 3.0, '{"low":"N/A","normal":"< 3.0","high":"> 3.0"}', FALSE, NULL);

-- ============================================================================
-- HORMONE TESTS (6 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('HT001', 'Hormone Tests', 'TSH', 'Thyroid Stimulating Hormone', 'µIU/mL', 0.4, 4.5, '{"low":"< 0.4","normal":"0.4 - 4.5","high":"> 4.5"}', FALSE, NULL),
('HT002', 'Hormone Tests', 'T3', 'Triiodothyronine', 'ng/dL', 80, 200, '{"low":"< 80","normal":"80 - 200","high":"> 200"}', FALSE, NULL),
('HT003', 'Hormone Tests', 'T4', 'Thyroxine', 'µg/dL', 5.0, 12.0, '{"low":"< 5.0","normal":"5.0 - 12.0","high":"> 12.0"}', FALSE, NULL),
('HT004', 'Hormone Tests', 'Insulin', 'Insulin', 'µIU/mL', 2.0, 25.0, '{"low":"< 2.0","normal":"2.0 - 25.0","high":"> 25.0"}', FALSE, NULL),
('HT005', 'Hormone Tests', 'Cortisol', 'Cortisol', 'µg/dL', 6.0, 23.0, '{"low":"< 6.0","normal":"6.0 - 23.0","high":"> 23.0"}', FALSE, NULL),
('HT006', 'Hormone Tests', 'Prolactin', 'Prolactin', 'ng/mL', 2.0, 29.0, '{"low":"< 2.0","normal":"2.0 - 29.0","high":"> 29.0"}', FALSE, '{"male":{"min":2.0,"max":18.0},"female":{"min":2.0,"max":29.0}}');

-- ============================================================================
-- LIVER FUNCTION TESTS (7 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('LFT001', 'Liver Function Tests', 'Bilirubin Total', 'Total Bilirubin', 'mg/dL', 0.1, 1.2, '{"low":"< 0.1","normal":"0.1 - 1.2","high":"> 1.2"}', FALSE, NULL),
('LFT002', 'Liver Function Tests', 'Bilirubin Direct', 'Direct Bilirubin', 'mg/dL', 0, 0.3, '{"low":"N/A","normal":"< 0.3","high":"> 0.3"}', FALSE, NULL),
('LFT003', 'Liver Function Tests', 'SGPT / ALT', 'ALT', 'U/L', 7, 56, '{"low":"< 7","normal":"7 - 56","high":"> 56"}', FALSE, NULL),
('LFT004', 'Liver Function Tests', 'SGOT / AST', 'AST', 'U/L', 10, 40, '{"low":"< 10","normal":"10 - 40","high":"> 40"}', FALSE, NULL),
('LFT005', 'Liver Function Tests', 'Alkaline Phosphatase', 'Alkaline Phosphatase', 'U/L', 44, 147, '{"low":"< 44","normal":"44 - 147","high":"> 147"}', FALSE, NULL),
('LFT006', 'Liver Function Tests', 'Albumin', 'Albumin', 'g/dL', 3.5, 5.5, '{"low":"< 3.5","normal":"3.5 - 5.5","high":"> 5.5"}', FALSE, NULL),
('LFT007', 'Liver Function Tests', 'Globulin', 'Globulin', 'g/dL', 2.0, 3.5, '{"low":"< 2.0","normal":"2.0 - 3.5","high":"> 3.5"}', FALSE, NULL);

-- ============================================================================
-- KIDNEY / RENAL TESTS (7 tests)
-- ============================================================================

INSERT INTO test_definitions (test_id, category_name, test_name, parameter_name, unit, normal_min_value, normal_max_value, risk_level_logic, is_qualitative, gender_specific) VALUES
('KFT001', 'Kidney / Renal Tests', 'Serum Creatinine', 'Creatinine', 'mg/dL', 0.6, 1.3, '{"low":"< 0.6","normal":"0.6 - 1.3","high":"> 1.3"}', FALSE, '{"male":{"min":0.7,"max":1.3},"female":{"min":0.6,"max":1.1}}'),
('KFT002', 'Kidney / Renal Tests', 'Blood Urea', 'Blood Urea', 'mg/dL', 15, 45, '{"low":"< 15","normal":"15 - 45","high":"> 45"}', FALSE, NULL),
('KFT003', 'Kidney / Renal Tests', 'BUN', 'Blood Urea Nitrogen', 'mg/dL', 7, 20, '{"low":"< 7","normal":"7 - 20","high":"> 20"}', FALSE, NULL),
('KFT004', 'Kidney / Renal Tests', 'Uric Acid', 'Uric Acid', 'mg/dL', 3.5, 7.2, '{"low":"< 3.5","normal":"3.5 - 7.2","high":"> 7.2"}', FALSE, '{"male":{"min":3.5,"max":7.2},"female":{"min":2.6,"max":6.0}}'),
('KFT005', 'Kidney / Renal Tests', 'Sodium', 'Sodium', 'mEq/L', 136, 145, '{"low":"< 136","normal":"136 - 145","high":"> 145"}', FALSE, NULL),
('KFT006', 'Kidney / Renal Tests', 'Potassium', 'Potassium', 'mEq/L', 3.5, 5.0, '{"low":"< 3.5","normal":"3.5 - 5.0","high":"> 5.0"}', FALSE, NULL),
('KFT007', 'Kidney / Renal Tests', 'Chloride', 'Chloride', 'mEq/L', 96, 106, '{"low":"< 96","normal":"96 - 106","high":"> 106"}', FALSE, NULL);

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Count tests by category
SELECT 
    category_name,
    COUNT(*) as test_count
FROM test_definitions
GROUP BY category_name
ORDER BY category_name;

-- Total count
SELECT COUNT(*) as total_tests FROM test_definitions;

-- ============================================================================
-- End of SQL Insert Statements
-- ============================================================================
