# 📊 Master Test Data Structure - MedTrack

Complete reference data for all medical test definitions used in the MedTrack health report analysis system.

## 📁 Files Overview

### Data Files
- **`master_test_data.json`** - Master JSON file with all 94 test definitions
- **`master_test_data.sql`** - SQL insert statements for direct database insertion
- **`seed_test_definitions.js`** - Node.js script to seed the database via Prisma

### Model/Service Files
- **`schema.prisma`** - Prisma schema with `TestDefinition` model
- **`../services/testDefinitionService.js`** - Node.js utility service for backend
- **`../../lib/core/models/test_definition.dart`** - Dart model for Flutter app

## 📊 Test Data Summary

| Category | Tests | Description |
|----------|-------|-------------|
| 🩸 Blood Tests | 15 | CBC, RBC, WBC, Hemoglobin, Platelets, etc. |
| 🧪 Urine Tests | 11 | pH, Protein, Glucose, Ketones, etc. |
| ❤️ Heart / Cardiac Tests | 7 | Cholesterol, HDL, LDL, Triglycerides, etc. |
| 🫁 Lung / Respiratory Tests | 4 | SpO2, Respiratory Rate, FEV1, FVC |
| 🧠 Brain & Nervous System | 4 | Vitamin B12, Folate, EEG, CSF Glucose |
| 🦴 Bone & Vitamin Tests | 4 | Vitamin D, Calcium, Phosphorus, Magnesium |
| 🛡️ Infection & Immunity | 6 | CRP, HIV, HBsAg, Dengue, COVID, etc. |
| 🧬 Cancer Related Tests | 4 | PSA, CA-125, AFP, CEA |
| ⚖️ Hormone Tests | 6 | TSH, T3, T4, Insulin, Cortisol, Prolactin |
| 🧪 Liver Function Tests | 7 | Bilirubin, SGPT, SGOT, Albumin, etc. |
| 🩺 Kidney / Renal Tests | 7 | Creatinine, BUN, Urea, Sodium, Potassium |
| **TOTAL** | **94** | **Complete test database** |

## 🚀 Setup Instructions

### Backend Setup (Node.js + Prisma)

#### Step 1: Update Prisma Schema
The `TestDefinition` model has already been added to `schema.prisma`.

#### Step 2: Create Migration
```bash
cd med_backend
npx prisma migrate dev --name add_test_definitions
```

#### Step 3: Seed the Database
```bash
# Using the seed script
node prisma/seed_test_definitions.js

# OR manually run SQL
psql -U your_username -d your_database -f prisma/master_test_data.sql
```

#### Step 4: Generate Prisma Client
```bash
npx prisma generate
```

### Frontend Setup (Flutter/Dart)

#### Step 1: Copy Test Data JSON
The JSON file is already in `med_backend/prisma/master_test_data.json`. You can:
- Load it from assets
- Fetch it from your API
- Embed it directly in the app

#### Step 2: Initialize the Repository
```dart
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:medtrack/core/models/test_definition.dart';

Future<void> initializeTestDefinitions() async {
  // Load from assets
  final jsonString = await rootBundle.loadString(
    'assets/data/master_test_data.json'
  );
  final jsonData = json.decode(jsonString);
  
  final definitions = (jsonData['test_definitions'] as List)
      .map((json) => TestDefinition.fromJson(json))
      .toList();
  
  TestDefinitionRepository.initialize(definitions);
  
  print('✅ Loaded ${TestDefinitionRepository.count} test definitions');
}
```

## 💻 Usage Examples

### Backend (Node.js)

#### Example 1: Enrich Test Results
```javascript
const testDefinitionService = require('./services/testDefinitionService');

// Enrich a test result with reference ranges and status
const testResult = {
  testName: 'Hemoglobin',
  value: 14.5,
};

const enriched = testDefinitionService.enrichTestResult(testResult, 'male');
console.log(enriched);
// {
//   testName: 'Hemoglobin',
//   value: 14.5,
//   testCategory: 'Blood Tests',
//   parameterName: 'Hemoglobin',
//   unit: 'g/dL',
//   status: 'NORMAL',
//   referenceRange: '13.5 - 17.5 g/dL',
//   normalMin: 13.5,
//   normalMax: 17.5
// }
```

#### Example 2: Get Risk Status
```javascript
const status = testDefinitionService.getRiskStatus('BT001', 11.5, 'female');
console.log(status); // 'LOW'

const status2 = testDefinitionService.getRiskStatus('CT001', 250);
console.log(status2); // 'HIGH'
```

#### Example 3: Get Tests by Category
```javascript
const bloodTests = testDefinitionService.getByCategory('Blood Tests');
console.log(`Found ${bloodTests.length} blood tests`); // 15
```

#### Example 4: Validate Report Data
```javascript
// In your reports controller
async function processReport(reportData) {
  const enrichedResults = reportData.tests.map(test => {
    return testDefinitionService.enrichTestResult(test, reportData.userGender);
  });
  
  // Count abnormal results
  const abnormalCount = enrichedResults.filter(
    r => r.status !== 'NORMAL'
  ).length;
  
  return {
    ...reportData,
    tests: enrichedResults,
    abnormalCount,
    overallStatus: abnormalCount === 0 ? 'NORMAL' : 'CAUTION'
  };
}
```

### Frontend (Flutter/Dart)

#### Example 1: Get Test Definition
```dart
final hbDef = TestDefinitionRepository.getByTestId('BT001');
print(hbDef?.testName); // 'Hemoglobin'
print(hbDef?.getReferenceRange()); // '12.0 - 17.0 g/dL'
```

#### Example 2: Check Risk Status
```dart
final hbDef = TestDefinitionRepository.findByTestName('Hemoglobin');
final status = hbDef?.getRiskStatus(11.5, gender: 'female');
print(status); // 'LOW'

// For qualitative tests
final hivDef = TestDefinitionRepository.getByTestId('IT002');
final status2 = hivDef?.getRiskStatusQualitative('Negative');
print(status2); // 'NORMAL'
```

#### Example 3: Display Test Categories
```dart
Widget buildCategoryList() {
  final categories = TestDefinitionRepository.getAllCategories();
  
  return ListView.builder(
    itemCount: categories.length,
    itemBuilder: (context, index) {
      final category = categories[index];
      final tests = TestDefinitionRepository.getByCategory(category);
      
      return ExpansionTile(
        title: Text(category),
        subtitle: Text('${tests.length} tests'),
        children: tests.map((test) => ListTile(
          title: Text(test.testName),
          subtitle: Text(test.getReferenceRange()),
        )).toList(),
      );
    },
  );
}
```

#### Example 4: Analyze Test Result
```dart
class TestResultAnalyzer {
  static Map<String, dynamic> analyzeResult({
    required String testName,
    required double value,
    String? gender,
  }) {
    final testDef = TestDefinitionRepository.findByTestName(testName);
    if (testDef == null) {
      return {'error': 'Test not found'};
    }
    
    final status = testDef.getRiskStatus(value, gender: gender);
    final referenceRange = testDef.getReferenceRange();
    
    return {
      'testName': testDef.testName,
      'category': testDef.categoryName,
      'value': value,
      'unit': testDef.unit,
      'status': status,
      'referenceRange': referenceRange,
      'isNormal': status == 'NORMAL',
      'isAbnormal': status != 'NORMAL',
    };
  }
}

// Usage
final result = TestResultAnalyzer.analyzeResult(
  testName: 'Hemoglobin',
  value: 14.5,
  gender: 'male',
);
print(result);
```

## 🗃️ Database Queries

### Query 1: Get All Test Definitions
```sql
SELECT * FROM test_definitions ORDER BY category_name, test_name;
```

### Query 2: Find Tests by Category
```sql
SELECT test_id, test_name, unit, normal_min_value, normal_max_value
FROM test_definitions
WHERE category_name = 'Blood Tests';
```

### Query 3: Search by Test Name
```sql
SELECT * FROM test_definitions
WHERE test_name ILIKE '%hemoglobin%'
   OR parameter_name ILIKE '%hemoglobin%';
```

### Query 4: Get Gender-Specific Tests
```sql
SELECT test_id, test_name, gender_specific
FROM test_definitions
WHERE gender_specific IS NOT NULL;
```

### Query 5: Get Qualitative Tests
```sql
SELECT test_id, test_name, risk_level_logic
FROM test_definitions
WHERE is_qualitative = TRUE;
```

## 📝 Data Structure

### Test Definition Schema
```json
{
  "test_id": "BT001",
  "category_name": "Blood Tests",
  "test_name": "Hemoglobin",
  "parameter_name": "Hemoglobin",
  "unit": "g/dL",
  "normal_min_value": 12.0,
  "normal_max_value": 17.0,
  "risk_level_logic": {
    "low": "< 12.0",
    "normal": "12.0 - 17.0",
    "high": "> 17.0"
  },
  "is_qualitative": false,
  "gender_specific": {
    "male": { "min": 13.5, "max": 17.5 },
    "female": { "min": 12.0, "max": 15.5 }
  }
}
```

### Risk Level Logic

**Quantitative Tests** (numeric values):
- **LOW**: Value < `normal_min_value`
- **NORMAL**: `normal_min_value` ≤ Value ≤ `normal_max_value`
- **HIGH**: Value > `normal_max_value`

**Qualitative Tests** (text values):
- **NORMAL**: "Negative", "Non-Reactive", "Absent", "Normal"
- **HIGH**: "Positive", "Reactive", "Present", "Abnormal"

**Gender-Specific Tests**:
- Use `gender_specific.male` or `gender_specific.female` ranges when available
- Fall back to general ranges if gender not specified

## 🔄 Updating Test Data

### Add a New Test

1. **Edit JSON**: Add to `master_test_data.json`
```json
{
  "test_id": "NEW001",
  "category_name": "New Category",
  "test_name": "New Test",
  "parameter_name": "New Test",
  "unit": "unit",
  "normal_min_value": 0,
  "normal_max_value": 100,
  "risk_level_logic": {
    "low": "< 0",
    "normal": "0 - 100",
    "high": "> 100"
  }
}
```

2. **Re-run Seed Script**:
```bash
node prisma/seed_test_definitions.js
```

3. **Update Flutter App**: Re-bundle the JSON file

### Modify Existing Test

1. Update the JSON file
2. Re-seed the database
3. Update the app if needed

## 🧪 Testing

### Test the Seed Script
```bash
node prisma/seed_test_definitions.js
```

Expected output:
```
🌱 Starting seed process...
📊 Total tests to seed: 94
✅ Inserted: BT001 - Hemoglobin
...
✅ Successfully inserted: 94 tests
🎉 Seed process completed!
```

### Test the Service
```javascript
const testDefinitionService = require('./services/testDefinitionService');

console.log('Total tests:', testDefinitionService.getCount());
console.log('Categories:', testDefinitionService.getAllCategories());

const hb = testDefinitionService.getByTestId('BT001');
console.log('Hemoglobin:', hb);
```

## 📚 Reference

### Medical Reference Ranges
All test ranges are based on standard clinical laboratory reference values. These may vary slightly between laboratories and populations.

**Important Notes**:
- Reference ranges may vary by:
  - Age
  - Gender
  - Ethnicity
  - Laboratory methodology
  - Geographic location
- Always consult with healthcare providers for medical interpretation
- These ranges are for educational purposes

### Test ID Naming Convention
- **BT**: Blood Tests
- **UT**: Urine Tests
- **CT**: Cardiac/Heart Tests
- **LT**: Lung/Respiratory Tests
- **NT**: Nervous System Tests
- **VT**: Vitamin/Bone Tests
- **IT**: Infection/Immunity Tests
- **CAN**: Cancer Tests
- **HT**: Hormone Tests
- **LFT**: Liver Function Tests
- **KFT**: Kidney/Renal Function Tests

## 🤝 Contributing

To add new tests or update existing ones:
1. Follow the existing JSON structure
2. Use appropriate test ID prefix
3. Include accurate reference ranges from reliable medical sources
4. Test thoroughly before deploying

## 📄 License

This data is for use within the MedTrack application. Medical reference ranges are based on publicly available clinical guidelines.

---

**Generated**: February 5, 2026  
**Version**: 1.0.0  
**Total Tests**: 94  
**Categories**: 12
