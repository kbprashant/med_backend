# Auto-Population of Master Tables

## Overview

The system now automatically populates all master tables when you upload a medical report. The master tables include:

- **lab_centers** - Lab/diagnostic center information
- **test_master** - Test types (CBC, Thyroid, etc.)
- **test_parameters** - Individual parameters for each test
- **test_definitions** - Standard parameter definitions with normal ranges
- **test_results** - Actual test results (linked to all above tables)

## How It Works

### 1. Report Upload Flow

When you upload a report, the following happens automatically:

```
Upload Report → Extract OCR Text → Analyze Parameters
    ↓
Extract Lab Center Info → Create/Find Lab Center in lab_centers
    ↓
Create/Find Test Master → Save in test_master
    ↓
For Each Parameter:
    Create/Find Test Definition → Save in test_definitions
    Create/Find Test Parameter → Save in test_parameters
    ↓
Save Test Results → Link to all master tables in test_results
```

### 2. Lab Center Extraction

The system automatically extracts lab center information from OCR text:

- **Center Name**: Detected from headers (e.g., "APOLLO DIAGNOSTICS")
- **Location**: Address information if available
- **Phone Number**: Extracted from contact information
- **Email**: Extracted if present in the report

**Example OCR Input:**
```
APOLLO DIAGNOSTICS
Shop No. 123, MG Road, Bangalore - 560001
Phone: 080-12345678
Email: info@apollodiagnostics.com
```

**Result:** Creates or finds existing lab center and links it to the report.

### 3. Master Data Linking

Each test result is now linked to:

1. **TestDefinition** - Standard parameter definition with normal ranges
2. **TestParameter** - Parameter metadata (unit, normal min/max)
3. **TestMaster** - The test type/category
4. **LabCenter** - The diagnostic center that issued the report

This ensures complete data traceability and enables advanced features like:
- Cross-lab comparisons
- Test history across different labs
- Parameter trend analysis
- Reference range validation

## Database Schema

### lab_centers
```javascript
{
  id: UUID,
  centerName: String,
  type: String,          // "lab" or "scan"
  location: String,
  phoneNumber: String,
  email: String,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### test_master
```javascript
{
  id: UUID,
  testName: String,      // "Complete Blood Count"
  category: String,      // "Lab Reports"
  subcategory: String,   // "Blood Tests"
  description: String,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### test_parameters
```javascript
{
  id: UUID,
  testId: UUID,          // Links to test_master
  parameterName: String, // "Hemoglobin"
  unit: String,          // "g/dL"
  normalMin: Float,      // 13.0
  normalMax: Float,      // 17.0
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### test_definitions
```javascript
{
  id: UUID,
  testId: String,        // "BT001"
  categoryName: String,  // "Blood Tests"
  testName: String,      // "Hemoglobin"
  parameterName: String, // "Hemoglobin"
  unit: String,          // "g/dL"
  normalMinValue: Float,
  normalMaxValue: Float,
  riskLevelLogic: JSON,
  isQualitative: Boolean,
  genderSpecific: JSON,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### test_results (Updated)
```javascript
{
  id: UUID,
  reportId: UUID,
  testDefinitionId: UUID,  // ✨ NEW - Links to test_definitions
  parameterId: UUID,       // ✨ NEW - Links to test_parameters
  testCategory: String,
  testSubCategory: String,
  testName: String,
  parameterName: String,
  value: String,
  unit: String,
  status: String,
  referenceRange: String,
  normalMin: Float,        // ✨ NEW
  normalMax: Float,        // ✨ NEW
  testDate: DateTime,
  createdAt: DateTime
}
```

## Implementation Files

### 1. masterDataService.js
Location: `med_backend/services/masterDataService.js`

**Main Functions:**
- `extractLabCenterFromOCR(ocrText)` - Extracts lab info from OCR
- `findOrCreateLabCenter(labData)` - Creates/finds lab center
- `findOrCreateTestDefinition(paramData, categoryName)` - Creates/finds test definition
- `findOrCreateTestMaster(testName, category, subcategory)` - Creates/finds test master
- `findOrCreateTestParameter(testMasterId, paramData)` - Creates/finds test parameter
- `autoPopulateMasterTables(reportData, ocrText, parameters)` - Main orchestration function

### 2. extractionController.js (Updated)
Location: `med_backend/controllers/extractionController.js`

**Updated Functions:**
- `confirmAndSave()` - Now calls `autoPopulateMasterTables()` before saving report
- `manualSave()` - Also populates master tables for manually entered data

## Testing

### Run the Test Script

```bash
cd med_backend
node test_auto_population.js
```

This will:
1. Show current database state
2. Run auto-population with sample data
3. Show new database state
4. Display created/found records

### Expected Output

```
🧪 Testing Auto-Population of Master Tables

📊 Database State BEFORE Auto-Population:
   Lab Centers:      0
   Test Masters:     0
   Test Definitions: 100
   Test Parameters:  0

🔄 AUTO-POPULATING MASTER TABLES

1️⃣  Processing Lab Center...
📌 Creating new lab center: APOLLO DIAGNOSTICS
✅ Lab center created: abc123-...

2️⃣  Processing Test Master...
📝 Creating TestMaster: Complete Blood Count
✅ Test Master ID: def456-...

3️⃣  Processing Test Definitions and Parameters...
   Processing: Hemoglobin
   ✓ TestDefinition found for: Hemoglobin
   📝 Creating TestParameter: Hemoglobin
   ...

✅ AUTO-POPULATION COMPLETE
Lab Centers:       1 linked
Test Masters:      1 linked
Test Definitions:  5 linked
Test Parameters:   5 linked
```

## Verification

### Check Master Tables

```bash
node check_master_tables.js
```

### Check Specific Report

After uploading a report, you can verify the data:

```javascript
// Check lab_centers
SELECT * FROM lab_centers;

// Check test_master
SELECT * FROM test_master;

// Check test_parameters
SELECT * FROM test_parameters WHERE test_id = 'your-test-id';

// Check test results with master data
SELECT 
  tr.*,
  td.parameter_name as def_param,
  tp.parameter_name as param_param,
  lc.center_name
FROM test_results tr
LEFT JOIN test_definitions td ON tr.test_definition_id = td.id
LEFT JOIN test_parameters tp ON tr.parameter_id = tp.id
LEFT JOIN reports r ON tr.report_id = r.id
LEFT JOIN lab_centers lc ON r.center_id = lc.id
WHERE tr.report_id = 'your-report-id';
```

## Usage in App

### Upload Report (Automatic)

When you upload a report through the app, everything happens automatically:

1. Select report image
2. OCR extraction runs
3. Parameters are detected
4. **✨ Master tables are auto-populated**
5. Report and test results are saved
6. Health summary is generated

**No manual intervention needed!**

### Manual Entry

Even when entering data manually:

1. Select report type
2. Enter parameters
3. **✨ Master tables are auto-populated**
4. Data is saved with proper linking

## Benefits

### 1. Data Consistency
- All reports use standardized test definitions
- Parameters are normalized across reports
- Lab centers are deduplicated

### 2. Advanced Features
- Compare results across different labs
- Track test history with proper linking
- Validate against standard reference ranges
- Gender-specific and age-specific ranges (future)

### 3. Analytics
- Lab-wise performance comparison
- Parameter correlation analysis
- Trend detection across test types
- Quality metrics per lab center

### 4. Maintenance
- Centralized parameter management
- Easy updates to reference ranges
- Consistent data model across the app

## Troubleshooting

### Issue: Tables still empty after upload

**Solution:**
1. Check backend logs for errors
2. Verify database connection
3. Ensure `masterDataService.js` is imported correctly
4. Run test script to verify functionality

### Issue: Lab center not detected

**Cause:** OCR text doesn't contain recognizable lab information

**Solution:**
- Lab center will be `null` (acceptable)
- System continues to work without lab center
- User can add lab info manually if needed

### Issue: Duplicate entries

**Solution:**
- System uses "find or create" pattern
- Duplicates are prevented by name matching
- Case-insensitive matching for parameters

## Future Enhancements

1. **Smart Lab Matching**: Use fuzzy matching for better lab detection
2. **Parameter Aliases**: Map common variations (e.g., "Hb" → "Hemoglobin")
3. **Batch Operations**: Optimize for multiple report uploads
4. **Data Migration**: Backfill existing reports with master data
5. **Admin Panel**: Manage master data through UI

## Summary

✅ Master tables are now **automatically populated** when you upload reports

✅ Lab centers, test definitions, and parameters are **created/linked automatically**

✅ Test results are **fully linked** to master data for complete traceability

✅ System works for both **OCR extraction** and **manual entry**

✅ **No manual database operations** required

**Just upload your report and everything is handled automatically!** 🎉
