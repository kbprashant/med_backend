# Production-Ready Category-Based Report Extraction System

## Overview

This is a **clean, modular, production-ready** medical report parameter extraction system that follows strict architectural principles:

- ✅ **Test category is NOT detected from OCR** - strictly taken from `request.body.category`
- ✅ **Only extracts parameters defined for that category** - ignores unrelated values
- ✅ **Uses regex for numeric extraction** - robust pattern matching
- ✅ **No hardcoded logic in controllers** - all extraction logic in services
- ✅ **Scalable and maintainable** - easy to add new categories and parameters

## Architecture

```
config/
  └── reportParameters.js     # Parameter definitions for each category
  
services/
  └── reportParser.js         # Extraction logic (NO hardcoding)
  
controllers/
  └── reportController.js     # API handlers (clean & modular)
  
routes/
  └── reportRoutes.js         # Route definitions
```

## Supported Categories

The system supports the following medical report categories:

1. **blood** - Complete Blood Count (CBC)
   - Hemoglobin, WBC, RBC, Platelet, Hematocrit, MCV, MCH, MCHC
   - Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils, ESR

2. **lipid** - Lipid Profile
   - Total Cholesterol, HDL, LDL, Triglycerides, VLDL, Non-HDL Cholesterol
   - Cholesterol/HDL Ratio

3. **thyroid** - Thyroid Function Test
   - TSH, T3, T4, Free T3, Free T4

4. **kidney** - Kidney Function Test (KFT)
   - Urea, Creatinine, Uric Acid, Sodium, Potassium, Chloride
   - eGFR, BUN/Creatinine Ratio

5. **liver** - Liver Function Test (LFT)
   - ALT, AST, Bilirubin, Direct Bilirubin, Indirect Bilirubin
   - Alkaline Phosphatase, GGT, Total Protein, Albumin, Globulin, A/G Ratio

6. **bp** - Blood Pressure
   - Systolic, Diastolic, Pulse

7. **diabetes** - Diabetes Panel
   - Fasting Blood Sugar, Random Blood Sugar, Postprandial Blood Sugar, HbA1c

8. **vitamin** - Vitamin Tests
   - Vitamin D, Vitamin B12, Folate, Vitamin A, Vitamin E

9. **urine** - Urine Analysis
   - Color, Appearance, pH, Specific Gravity, Protein, Glucose
   - Ketones, Blood, Bilirubin, Urobilinogen, Nitrite, Leukocyte Esterase

10. **cardiac** - Cardiac Markers
    - Troponin I, Troponin T, CK-MB, BNP, NT-proBNP

11. **hormone** - Hormone Panel
    - Testosterone, Estrogen, Progesterone, LH, FSH, Prolactin, Cortisol

## API Endpoints

### POST /api/reports/parse

Extract parameters from OCR text based on category.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "category": "blood",
  "ocrText": "COMPLETE BLOOD COUNT\n\nHemoglobin: 14.5 g/dl\nWBC: 7500 cells/cumm\nRBC: 5.2 million/cumm..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "category": "blood",
  "extractedResults": [
    {
      "parameter": "Hemoglobin",
      "value": "14.5",
      "unit": "g/dl"
    },
    {
      "parameter": "WBC",
      "value": "7500",
      "unit": "cells/cumm"
    }
  ]
}
```

**Failure Response (200):**
```json
{
  "success": false,
  "message": "No required parameters found for this category",
  "category": "blood"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Invalid category: xyz",
  "availableCategories": ["blood", "lipid", "thyroid", ...]
}
```

### GET /api/reports/categories

Get list of all available categories.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "categories": [
    "blood",
    "lipid",
    "thyroid",
    "kidney",
    "liver",
    "bp",
    "diabetes",
    "vitamin",
    "urine",
    "cardiac",
    "hormone"
  ]
}
```

### GET /api/reports/health

Health check endpoint (no authentication required).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Report parsing service is operational",
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

## How It Works

### 1. Text Normalization
```javascript
// Convert to lowercase, normalize spaces, handle multiline
const normalizedText = normalizeText(ocrText);
```

### 2. Parameter Matching
```javascript
// For each parameter in category definition
for (const parameter of parameters) {
  // Try each alias until match found
  for (const alias of parameter.aliases) {
    const result = extractValueForAlias(normalizedText, alias);
    if (result) {
      extractedResults.push({
        parameter: parameter.name,
        value: result.value,
        unit: result.unit
      });
      break; // Stop after first match
    }
  }
}
```

### 3. Numeric Extraction
```javascript
// Regex pattern: alias + optional separator + numeric value
const pattern = new RegExp(
  escapedAlias + 
  '\\s*[:\\s-]*\\s*' +           // Optional colon, space, or hyphen
  '([+-]?\\d+(?:\\.\\d+)?)',     // Capture numeric value
  'i'
);
```

### 4. Unit Detection
```javascript
// Extract unit from text following the number
const unitPatterns = [
  /^\s*(mg\/dl|g\/dl|mmol\/l|...)/i,
  /^\s*(cells?\/cumm|million\/cumm|...)/i,
  /^\s*(%|percent|bpm|mmhg|...)/i
];
```

## Adding New Categories

To add a new category, simply update `config/reportParameters.js`:

```javascript
const REPORT_PARAMETERS = {
  // ... existing categories ...
  
  newcategory: [
    { 
      name: "Parameter Name", 
      aliases: ["parameter name", "param", "alternative name"] 
    },
    // ... more parameters
  ]
};
```

**No changes needed in:**
- Controllers
- Services
- Routes
- API logic

## Adding New Parameters

To add parameters to an existing category:

```javascript
blood: [
  // ... existing parameters ...
  
  { 
    name: "New Blood Parameter", 
    aliases: ["new blood parameter", "nbp", "alternate name"] 
  }
]
```

## Testing

### Run Test Script

```bash
cd med_backend
node test_report_parser.js
```

### Manual Testing with curl

```bash
# Get categories
curl http://localhost:5000/api/reports/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Parse blood report
curl -X POST http://localhost:5000/api/reports/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "category": "blood",
    "ocrText": "Hemoglobin: 14.5 g/dl\nWBC: 7500 cells/cumm"
  }'
```

## Error Handling

The system handles:
- ✅ Missing or invalid category
- ✅ Empty OCR text
- ✅ No parameters found
- ✅ Malformed request
- ✅ Server errors

All errors return structured JSON responses:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

## Key Design Principles

### 1. Separation of Concerns
- **Config**: Parameter definitions only
- **Service**: Extraction logic only
- **Controller**: Request/response handling only
- **Routes**: Endpoint definitions only

### 2. No Hardcoding
- All parameters defined in configuration
- All extraction logic in reusable functions
- Controller has ZERO hardcoded extraction logic

### 3. Scalability
- Add new categories without touching code
- Add new parameters without touching code
- Easy to extend with new features

### 4. Production-Ready
- Proper error handling
- Input validation
- Async/await throughout
- Clean, readable code
- Comprehensive logging

## File Structure

```
med_backend/
├── config/
│   └── reportParameters.js      # 280+ lines, 11 categories, 100+ parameters
├── services/
│   └── reportParser.js          # 250+ lines, extraction logic
├── controllers/
│   └── reportController.js      # 180+ lines, API handlers
├── routes/
│   └── reportRoutes.js          # 35 lines, route definitions
└── test_report_parser.js        # 250+ lines, test script
```

## Why This Architecture?

### ❌ Old Approach (Schema-Based)
- Detected test type from OCR (unreliable)
- Complex schema matching logic
- Hardcoded extraction rules
- Difficult to maintain
- Prone to false positives

### ✅ New Approach (Category-Based)
- Category explicitly provided by user
- Simple parameter matching via aliases
- All logic in configuration
- Easy to maintain and extend
- Deterministic results

## Environment

```env
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
```

## Dependencies

- express
- axios (for testing)
- dotenv
- JWT authentication middleware

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Configure proper JWT authentication
3. Set up rate limiting
4. Enable HTTPS
5. Configure CORS properly
6. Set up monitoring/logging
7. Deploy with PM2 or similar

## Support

For questions or issues, refer to:
- API Reference: `API_REFERENCE.md`
- Test script: `test_report_parser.js`
- Configuration: `config/reportParameters.js`

---

**Built with ❤️ for MedTrack**
