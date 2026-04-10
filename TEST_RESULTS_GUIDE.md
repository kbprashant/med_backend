# Test Results Implementation Guide

## Overview
This guide explains how test results are stored, retrieved, and displayed in the MedTrack application.

## Database Schema

### Table: test_results

The `test_results` table stores all medical test data with the following structure:

```sql
model TestResult {
  id              String   @id @default(uuid())
  reportId        String
  testCategory    String   // e.g., "Blood Test", "Thyroid Test"
  testSubCategory String?  // e.g., "TSH", "T3", "T4", "Glucose"
  testName        String   // e.g., "Thyroid Test", "Blood Sugar Test"
  parameterName   String   // e.g., "TSH", "Glucose", "Hemoglobin"
  value           String   // Stored as string, converted to float for calculations
  unit            String?  // e.g., "mg/dL", "mIU/L", "g/dL"
  status          String   // "NORMAL", "HIGH", "LOW"
  referenceRange  String?  // e.g., "70-100" or "<200" or ">10"
  normalMin       Float?   // Minimum normal value
  normalMax       Float?   // Maximum normal value
  testDate        DateTime // Date when test was conducted
  createdAt       DateTime @default(now())
  
  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  
  @@index([testName, testDate])
  @@index([testCategory, testSubCategory])
  @@map("test_results")
}
```

### Table: health_summary

The `health_summary` table stores summary information for each report:

```sql
model HealthSummary {
  id             String   @id @default(uuid())
  userId         String
  reportId       String   // Single report ID for this summary
  summaryText    String   @db.Text
  insights       String?  @db.Text
  overallStatus  String   // "NORMAL", "CAUTION", "CRITICAL"
  abnormalCount  Int      @default(0)
  riskLevel      String   @default("LOW") // "LOW", "MEDIUM", "HIGH"
  createdAt      DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("health_summaries")
}
```

## Data Flow

### 1. Uploading a New Report

When a user uploads a medical report:

**API Endpoint:** `POST /api/reports`

**Request Body:**
```json
{
  "testType": "Thyroid Test",
  "reportDate": "2026-01-29",
  "ocrText": "extracted text...",
  "testResults": [
    {
      "testCategory": "Thyroid Test",
      "testSubCategory": "TSH",
      "testName": "Thyroid Test",
      "parameterName": "TSH",
      "value": "2.5",
      "unit": "mIU/L",
      "status": "NORMAL",
      "referenceRange": "0.5-5.0",
      "normalMin": 0.5,
      "normalMax": 5.0
    },
    {
      "testCategory": "Thyroid Test",
      "testSubCategory": "T3",
      "testName": "Thyroid Test",
      "parameterName": "T3",
      "value": "120",
      "unit": "ng/dL",
      "status": "HIGH",
      "referenceRange": "80-200",
      "normalMin": 80,
      "normalMax": 200
    }
  ]
}
```

**Backend Processing:**
1. Create report entry in `reports` table
2. For each test result:
   - Insert into `test_results` table
   - Set `testDate` to `reportDate`
   - Store category, sub-category, and parameter information
3. Calculate health summary:
   - Count abnormal results
   - Determine overall status and risk level
   - Insert into `health_summaries` table

**Controller Implementation** (reportController.js):
```javascript
async uploadReport(req, res, next) {
  try {
    const userId = req.user.id;
    const { testType, reportDate, ocrText, testResults } = req.body;

    const reportData = {
      userId,
      testType,
      reportDate: new Date(reportDate),
      ocrText,
    };

    if (testResults && testResults.length > 0) {
      reportData.testResults = {
        create: testResults.map((result) => ({
          testCategory: result.testCategory || testType,
          testSubCategory: result.testSubCategory || result.parameterName,
          testName: result.testName || testType,
          parameterName: result.parameterName,
          value: result.value,
          unit: result.unit || null,
          status: result.status,
          referenceRange: result.referenceRange || null,
          normalMin: result.normalMin ? parseFloat(result.normalMin) : null,
          normalMax: result.normalMax ? parseFloat(result.normalMax) : null,
          testDate: new Date(reportDate),
        })),
      };
    }

    const report = await prisma.report.create({
      data: reportData,
      include: { testResults: true },
    });

    // Generate health summary
    if (testResults && testResults.length > 0) {
      const abnormalCount = testResults.filter(r => r.status !== 'NORMAL').length;
      const totalTests = testResults.length;
      const abnormalPercentage = (abnormalCount / totalTests) * 100;

      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';

      if (abnormalPercentage > 50) {
        overallStatus = 'CRITICAL';
        riskLevel = 'HIGH';
      } else if (abnormalPercentage > 20) {
        overallStatus = 'CAUTION';
        riskLevel = 'MEDIUM';
      }

      await prisma.healthSummary.create({
        data: {
          userId,
          reportId: report.id,
          summaryText: `Test Report Summary for ${testType}`,
          overallStatus,
          abnormalCount,
          riskLevel,
        },
      });
    }

    res.status(201).json({ message: 'Report uploaded successfully', report });
  } catch (error) {
    next(error);
  }
}
```

### 2. Fetching Test History for Graphs

**API Endpoint:** `GET /api/reports/tests/history?testName=Thyroid Test`

**Query Parameters:**
- `testName` (required): Name of the test (e.g., "Thyroid Test")
- `testSubCategory` (optional): Specific parameter (e.g., "TSH")

**Response:**
```json
{
  "testName": "Thyroid Test",
  "testSubCategory": null,
  "results": [
    {
      "id": "uuid",
      "testDate": "2025-11-15T00:00:00.000Z",
      "parameterName": "TSH",
      "value": 2.3,
      "unit": "mIU/L",
      "status": "NORMAL",
      "normalMin": 0.5,
      "normalMax": 5.0
    },
    {
      "id": "uuid",
      "testDate": "2026-01-29T00:00:00.000Z",
      "parameterName": "TSH",
      "value": 2.5,
      "unit": "mIU/L",
      "status": "NORMAL",
      "normalMin": 0.5,
      "normalMax": 5.0
    }
  ]
}
```

**Controller Implementation:**
```javascript
async getTestHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { testName, testSubCategory } = req.query;

    if (!testName) {
      return res.status(400).json({ error: 'testName is required' });
    }

    const where = {
      report: { userId },
      testName,
    };

    if (testSubCategory) {
      where.testSubCategory = testSubCategory;
    }

    const results = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'asc' },
      select: {
        id: true,
        testDate: true,
        value: true,
        unit: true,
        status: true,
        parameterName: true,
        normalMin: true,
        normalMax: true,
      },
    });

    res.json({
      testName,
      testSubCategory,
      results: results.map((r) => ({
        ...r,
        value: parseFloat(r.value) || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
}
```

### 3. Fetching Recent Test Results (Table Display)

**API Endpoint:** `GET /api/reports/tests/recent?testName=Thyroid Test&limit=3`

**Query Parameters:**
- `testName` (required): Name of the test
- `limit` (optional, default: 3): Number of recent results to return

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "testDate": "2026-01-29T00:00:00.000Z",
      "parameterName": "TSH",
      "value": "2.5",
      "unit": "mIU/L",
      "status": "NORMAL",
      "normalMin": 0.5,
      "normalMax": 5.0
    },
    {
      "id": "uuid",
      "testDate": "2025-11-15T00:00:00.000Z",
      "parameterName": "TSH",
      "value": "2.3",
      "unit": "mIU/L",
      "status": "NORMAL",
      "normalMin": 0.5,
      "normalMax": 5.0
    }
  ]
}
```

### 4. Fetching Full Test History (History Screen)

**API Endpoint:** `GET /api/reports/tests/full-history?testName=Thyroid Test`

**Query Parameters:**
- `testName` (required): Name of the test
- `testSubCategory` (optional): Filter by specific parameter

**Response:**
```json
{
  "testName": "Thyroid Test",
  "testSubCategory": null,
  "totalResults": 5,
  "results": [
    {
      "id": "uuid",
      "testCategory": "Thyroid Test",
      "testSubCategory": "TSH",
      "testName": "Thyroid Test",
      "parameterName": "TSH",
      "value": "2.5",
      "unit": "mIU/L",
      "status": "NORMAL",
      "referenceRange": "0.5-5.0",
      "normalMin": 0.5,
      "normalMax": 5.0,
      "testDate": "2026-01-29T00:00:00.000Z",
      "createdAt": "2026-01-29T10:30:00.000Z",
      "report": {
        "testType": "Thyroid Test",
        "reportDate": "2026-01-29T00:00:00.000Z"
      }
    }
  ]
}
```

## Flutter Integration

### Service Layer (test_history_service.dart)

```dart
class TestHistoryService {
  /// Get test history for graphs
  static Future<List<Map<String, dynamic>>> getTestHistory({
    required String testName,
    String? testSubCategory,
  }) async {
    final queryParams = {
      'testName': testName,
      if (testSubCategory != null) 'testSubCategory': testSubCategory,
    };

    final queryString = Uri(queryParameters: queryParams).query;
    final url = '${ApiConfig.reportUrl}/tests/history?$queryString';

    final response = await HttpService.get(url, requiresAuth: true);

    if (response['results'] != null) {
      return List<Map<String, dynamic>>.from(response['results']);
    }
    return [];
  }
}
```

### Report Detail Screen

The Report Detail Screen (`report_detail_screen.dart`) displays:

1. **Report Header**: Test name, date, lab name
2. **Line Graph**: Shows trend of test values over time
   - X-axis: Test dates
   - Y-axis: Test values
   - Dots colored by status (green=normal, red=high, yellow=low)
   - Tap graph to navigate to full history
3. **Recent Results Table**: Shows last 3-4 test results
   - Columns: Date | Parameter | Value | Normal Range | Status
   - Button to view full history

### Full History Screen

The Test History Screen (`test_history_screen.dart`) displays:
- Year and month filters
- Scrollable table with all historical results
- Date-wise sorted (latest first)
- Status badges with color coding

## Testing the Implementation

### 1. Create Test Data

Use the provided `add_test_results.js` script:

```bash
cd med_backend
node add_test_results.js <userId>
```

### 2. Verify Database

```bash
node check_data.js
```

This will show:
- All reports
- All test results
- All health summaries

### 3. Test API Endpoints

```bash
# Get test history
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/tests/history?testName=Thyroid%20Test"

# Get recent tests
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/tests/recent?testName=Thyroid%20Test&limit=3"

# Get full history
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/reports/tests/full-history?testName=Thyroid%20Test"
```

### 4. Test Flutter App

1. Run the app: `flutter run`
2. Upload a test report
3. Navigate to Report Details
4. Verify:
   - Graph displays correctly
   - Recent results table shows data
   - Tapping graph navigates to full history
   - Full history screen shows all results with filters

## Common Issues & Solutions

### Issue: "No test history found"

**Causes:**
1. No data in database for that test name
2. Test name mismatch between report and query
3. Backend API returning empty results
4. Authentication token expired

**Solutions:**
1. Add test data using `add_test_results.js`
2. Check test name consistency (case-sensitive)
3. Verify API response in browser/Postman
4. Re-login to get fresh token

### Issue: Graph not displaying

**Causes:**
1. Empty test history
2. Invalid data values (non-numeric)
3. All values are the same (no Y-axis range)

**Solutions:**
1. Ensure test results exist
2. Verify `value` field contains numeric strings
3. Add diverse test values for better visualization

### Issue: Database not storing test results

**Causes:**
1. Missing required fields in request
2. Prisma schema mismatch
3. Database connection issues

**Solutions:**
1. Validate request body against schema
2. Run `npx prisma generate` and `npx prisma db push`
3. Check database connection string in `.env`

## Migration from Old Schema

If upgrading from an older schema without the test results structure:

1. Backup existing database
2. Update schema in `prisma/schema.prisma`
3. Run migration:
   ```bash
   npx prisma migrate dev --name add_test_results
   ```
4. Migrate existing report data to test_results table if needed

## Best Practices

1. **Always set testDate**: Use the report date or actual test conduct date
2. **Use consistent naming**: Keep test names and categories standardized
3. **Store numeric values as strings**: Convert to float only for calculations
4. **Include reference ranges**: Store both string format and min/max values
5. **Update health summaries**: Always create/update summary when adding test results
6. **Handle errors gracefully**: Provide meaningful error messages to users
7. **Validate input data**: Ensure all required fields are present before inserting

## API Routes Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/reports` | Upload new report with test results |
| GET | `/api/reports` | Get all reports for user |
| GET | `/api/reports/:id` | Get single report by ID |
| GET | `/api/reports/tests/history` | Get test history for graphs |
| GET | `/api/reports/tests/recent` | Get recent test results |
| GET | `/api/reports/tests/full-history` | Get complete test history |
| DELETE | `/api/reports/:id` | Delete report and related test results |

## Conclusion

This implementation provides a comprehensive system for storing, retrieving, and visualizing medical test data. The architecture supports:
- Historical tracking of test results
- Trend analysis through graphs
- Detailed test history views
- Flexible categorization (category, sub-category, parameter)
- Health summaries and risk assessment

For additional help, refer to:
- `BACKEND_INTEGRATION.md`
- `TESTING_GUIDE.md`
- `API_REFERENCE.md`
