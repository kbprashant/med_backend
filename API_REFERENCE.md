# API Endpoints Reference

## Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication Endpoints

### 1. Register User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "message": "Registration initiated. Please verify your email with the OTP sent.",
  "userId": "uuid",
  "email": "john@example.com"
}
```

---

### 2. Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "john@example.com",
  "otpCode": "123456"
}
```

**Success Response (200):**
```json
{
  "message": "Email verified successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210"
  }
}
```

---

### 3. Resend OTP
**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "New OTP sent to your email"
}
```

---

### 4. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210"
  }
}
```

---

### 5. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If the email exists, an OTP has been sent"
}
```

---

### 6. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "john@example.com",
  "otpCode": "123456",
  "newPassword": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successful"
}
```

---

### 7. Get Profile
**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210",
    "isVerified": true,
    "createdAt": "2025-01-29T10:00:00.000Z"
  }
}
```

---

## 📄 Report Endpoints (All Protected)

### 1. Upload Report
**Endpoint:** `POST /api/reports`

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "testType": "Blood Test",
  "reportDate": "2025-01-29",
  "ocrText": "Glucose: 95 mg/dL\nCholesterol: 180 mg/dL",
  "testResults": [
    {
      "testName": "Blood Test",
      "parameterName": "Glucose",
      "value": "95",
      "unit": "mg/dL",
      "status": "NORMAL",
      "referenceRange": "70-100"
    },
    {
      "testName": "Blood Test",
      "parameterName": "Total Cholesterol",
      "value": "180",
      "unit": "mg/dL",
      "status": "NORMAL",
      "referenceRange": "0-200"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "message": "Report uploaded successfully",
  "report": {
    "id": "uuid",
    "userId": "uuid",
    "testType": "Blood Test",
    "reportDate": "2025-01-29T00:00:00.000Z",
    "ocrText": "...",
    "testResults": [...]
  }
}
```

---

### 2. Get All Reports
**Endpoint:** `GET /api/reports`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `testType` (optional): Filter by test type

**Example:**
```
GET /api/reports?page=1&limit=10&testType=Blood Test
```

**Success Response (200):**
```json
{
  "reports": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. Get Single Report
**Endpoint:** `GET /api/reports/:id`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "report": {
    "id": "uuid",
    "testType": "Blood Test",
    "reportDate": "2025-01-29T00:00:00.000Z",
    "testResults": [...]
  }
}
```

---

### 4. Delete Report
**Endpoint:** `DELETE /api/reports/:id`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "message": "Report deleted successfully"
}
```

---

### 5. Get Test Types
**Endpoint:** `GET /api/reports/test-types`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "testTypes": ["Blood Test", "Lipid Profile", "Kidney Function", ...]
}
```

---

### 6. Get Categories with Subcategories
**Endpoint:** `GET /api/reports/categories`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Description:**
Returns all unique test categories with their subcategories for the authenticated user.

**Success Response (200):**
```json
{
  "categories": [
    {
      "category": "Blood Test",
      "subCategories": ["CBC", "Hemoglobin", "Platelet Count"]
    },
    {
      "category": "Lipid Profile",
      "subCategories": ["Total Cholesterol", "HDL", "LDL", "Triglycerides"]
    }
  ]
}
```

---

### 7. Get Category Table Data
**Endpoint:** `GET /api/reports/category-table-data`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `category` (required): Test category name
- `subCategory` (optional): Test subcategory name

**Example:**
```
GET /api/reports/category-table-data?category=Blood Test&subCategory=CBC
```

**Description:**
Returns test data in table format with parameters as rows and dates as columns.
Perfect for displaying an excel-like view of test results over time.

**Success Response (200):**
```json
{
  "category": "Blood Test",
  "subCategory": "CBC",
  "dates": ["2024-01-15", "2024-02-15", "2024-03-15"],
  "parameters": ["Hemoglobin", "WBC Count", "Platelet Count"],
  "tableData": [
    {
      "parameter": "Hemoglobin",
      "unit": "g/dL",
      "normalMin": 13.0,
      "normalMax": 17.0,
      "referenceRange": "13-17 g/dL",
      "dateValues": [
        {
          "value": "14.5",
          "status": "NORMAL",
          "id": "result-id-1"
        },
        {
          "value": "15.2",
          "status": "NORMAL",
          "id": "result-id-2"
        },
        {
          "value": "14.8",
          "status": "NORMAL",
          "id": "result-id-3"
        }
      ]
    },
    {
      "parameter": "WBC Count",
      "unit": "cells/μL",
      "normalMin": 4000,
      "normalMax": 11000,
      "referenceRange": "4000-11000",
      "dateValues": [
        {
          "value": "7500",
          "status": "NORMAL",
          "id": "result-id-4"
        },
        {
          "value": "8200",
          "status": "NORMAL",
          "id": "result-id-5"
        },
        {
          "value": "12000",
          "status": "HIGH",
          "id": "result-id-6"
        }
      ]
    }
  ],
  "summary": [
    {
      "date": "2024-01-15",
      "normalCount": 3,
      "abnormalCount": 0,
      "totalTests": 3
    },
    {
      "date": "2024-02-15",
      "normalCount": 3,
      "abnormalCount": 0,
      "totalTests": 3
    },
    {
      "date": "2024-03-15",
      "normalCount": 2,
      "abnormalCount": 1,
      "totalTests": 3
    }
  ]
}
```

---

## 🧠 Health Analysis Endpoints (All Protected)

### 1. Generate Health Summary
**Endpoint:** `POST /api/health/summary`

**Headers:**
```
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "reportIds": ["uuid1", "uuid2"]
}
```
*Note: If `reportIds` is empty or omitted, uses last 5 reports*

**Success Response (200):**
```json
{
  "message": "Health summary generated successfully",
  "summary": {
    "id": "uuid",
    "summaryText": "Health Summary based on 2 recent report(s)...",
    "insights": "Great News: All your test parameters are within healthy ranges.",
    "reportIds": ["uuid1", "uuid2"],
    "createdAt": "2025-01-29T10:00:00.000Z"
  }
}
```

---

### 2. Get Latest Summary
**Endpoint:** `GET /api/health/summary/latest`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "summary": {
    "id": "uuid",
    "summaryText": "...",
    "insights": "...",
    "createdAt": "2025-01-29T10:00:00.000Z"
  }
}
```

---

### 3. Get All Summaries
**Endpoint:** `GET /api/health/summary`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Success Response (200):**
```json
{
  "summaries": [...],
  "pagination": {...}
}
```

---

### 4. Get Parameter Trends
**Endpoint:** `GET /api/health/trends`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `parameter` (required): Parameter name (e.g., "Glucose")
- `months` (optional): Number of months (default: 6)

**Example:**
```
GET /api/health/trends?parameter=Glucose&months=6
```

**Success Response (200):**
```json
{
  "parameter": "Glucose",
  "trends": [
    {
      "date": "2024-08-15T00:00:00.000Z",
      "value": 92,
      "unit": "mg/dL",
      "status": "NORMAL"
    },
    {
      "date": "2024-10-20T00:00:00.000Z",
      "value": 95,
      "unit": "mg/dL",
      "status": "NORMAL"
    }
  ],
  "count": 2
}
```

---

### 5. Get Test Type Insights
**Endpoint:** `GET /api/health/insights/:testType`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Example:**
```
GET /api/health/insights/Blood Test
```

**Success Response (200):**
```json
{
  "testType": "Blood Test",
  "totalReports": 5,
  "latestReportDate": "2025-01-29T00:00:00.000Z",
  "abnormalCount": {
    "HIGH": 2,
    "LOW": 1
  },
  "latestResults": [...]
}
```

---

## 📊 History Endpoints (All Protected)

### 1. Get Full History
**Endpoint:** `GET /api/history`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `testType`: Filter by test type
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)
- `month`: Month (1-12)
- `year`: Year (e.g., 2025)
- `sortBy`: Sort field (default: reportDate)
- `sortOrder`: asc or desc (default: desc)

**Example:**
```
GET /api/history?page=1&limit=20&month=1&year=2025&testType=Blood Test
```

**Success Response (200):**
```json
{
  "reports": [...],
  "pagination": {...}
}
```

---

### 2. Get Graph Data
**Endpoint:** `GET /api/history/graph`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `parameter` (required): Parameter name
- `months` (optional): Number of months (default: 12)

**Example:**
```
GET /api/history/graph?parameter=Glucose&months=12
```

**Success Response (200):**
```json
{
  "parameter": "Glucose",
  "data": [
    {
      "date": "2024-02-15T00:00:00.000Z",
      "value": 90,
      "unit": "mg/dL",
      "status": "NORMAL",
      "reportId": "uuid"
    },
    {
      "date": "2025-01-29T00:00:00.000Z",
      "value": 95,
      "unit": "mg/dL",
      "status": "NORMAL",
      "reportId": "uuid",
      "isLatest": true
    }
  ],
  "count": 2
}
```

---

### 3. Get Statistics
**Endpoint:** `GET /api/history/statistics`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Success Response (200):**
```json
{
  "statistics": {
    "totalReports": 15,
    "totalTestTypes": 5,
    "recentAbnormalCount": 3,
    "latestReportDate": "2025-01-29T00:00:00.000Z"
  }
}
```

---

### 4. Get Monthly Summary
**Endpoint:** `GET /api/history/monthly`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `year` (required): Year

**Example:**
```
GET /api/history/monthly?year=2025
```

**Success Response (200):**
```json
{
  "year": 2025,
  "monthlySummary": [
    {
      "month": 1,
      "count": 5,
      "reports": [...]
    },
    {
      "month": 2,
      "count": 0,
      "reports": []
    },
    ...
  ],
  "totalReports": 5
}
```

---

### 5. Compare Reports
**Endpoint:** `GET /api/history/compare`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `reportId1` (required): First report ID
- `reportId2` (required): Second report ID

**Example:**
```
GET /api/history/compare?reportId1=uuid1&reportId2=uuid2
```

**Success Response (200):**
```json
{
  "report1": {
    "id": "uuid1",
    "testType": "Blood Test",
    "date": "2024-12-01T00:00:00.000Z"
  },
  "report2": {
    "id": "uuid2",
    "testType": "Blood Test",
    "date": "2025-01-29T00:00:00.000Z"
  },
  "comparison": [
    {
      "parameter": "Glucose",
      "report1": {
        "value": "90",
        "unit": "mg/dL",
        "status": "NORMAL"
      },
      "report2": {
        "value": "95",
        "unit": "mg/dL",
        "status": "NORMAL"
      },
      "change": 5,
      "percentChange": 5.56,
      "trend": "increased"
    }
  ]
}
```

---

### 6. Compare Data by Dates
**Endpoint:** `GET /api/history/compare-dates`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Query Parameters:**
- `category` (required): Test category name
- `subCategory` (optional): Test subcategory name
- `date1` (required): First date (YYYY-MM-DD)
- `date2` (required): Second date (YYYY-MM-DD)

**Example:**
```
GET /api/history/compare-dates?category=Blood Test&subCategory=CBC&date1=2024-01-15&date2=2024-02-15
```

**Description:**
Compares test results between two dates for a specific category/subcategory.
The comparison is always based on the older date as the baseline.

**Success Response (200):**
```json
{
  "category": "Blood Test",
  "subCategory": "CBC",
  "olderDate": "2024-01-15",
  "newerDate": "2024-02-15",
  "comparison": [
    {
      "parameter": "Hemoglobin",
      "unit": "g/dL",
      "referenceRange": "13-17 g/dL",
      "olderDate": {
        "date": "2024-01-15",
        "value": "14.5",
        "status": "NORMAL"
      },
      "newerDate": {
        "date": "2024-02-15",
        "value": "15.2",
        "status": "NORMAL"
      },
      "change": 0.7,
      "percentChange": 4.83,
      "trend": "increased",
      "interpretation": "Both values within normal range"
    },
    {
      "parameter": "WBC Count",
      "unit": "cells/μL",
      "referenceRange": "4000-11000",
      "olderDate": {
        "date": "2024-01-15",
        "value": "7500",
        "status": "NORMAL"
      },
      "newerDate": {
        "date": "2024-02-15",
        "value": "12000",
        "status": "HIGH"
      },
      "change": 4500,
      "percentChange": 60.0,
      "trend": "increased",
      "interpretation": "Moved out of normal range - needs attention"
    },
    {
      "parameter": "Platelet Count",
      "unit": "cells/μL",
      "referenceRange": "150000-400000",
      "olderDate": {
        "date": "2024-01-15",
        "value": "250000",
        "status": "NORMAL"
      },
      "newerDate": null,
      "change": null,
      "percentChange": null,
      "trend": "not_comparable",
      "interpretation": "Parameter only tested on one date"
    }
  ]
}
```

**Interpretation Values:**
- `"No change"` - Values are identical
- `"Both values within normal range"` - Both NORMAL status
- `"Improved to normal range"` - Changed from abnormal to NORMAL
- `"Moved out of normal range - needs attention"` - Changed from NORMAL to abnormal
- `"Increased"` / `"Decreased"` - General change description
- `"Parameter only tested on one date"` - Not comparable

---

## ❌ Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Access denied. No token provided."
}
```

**404 Not Found:**
```json
{
  "error": "Record not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## 📝 Notes

1. All protected endpoints require `Authorization: Bearer <token>` header
2. Dates should be in ISO 8601 format (YYYY-MM-DD)
3. Phone numbers must be exactly 10 digits
4. OTP codes are 6 digits
5. Passwords must be at least 6 characters

---

**For detailed implementation examples, see QUICKSTART.md**
