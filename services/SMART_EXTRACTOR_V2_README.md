# Smart Medical Extractor V2 - Production Ready

A dictionary-based medical parameter extraction system that uses `masterDictionary.json` for accurate, structured data extraction from OCR text.

## Features

✅ **Dictionary-Based Matching** - Uses predefined medical vocabulary  
✅ **Report Type Detection** - Automatically identifies report type  
✅ **Status Determination** - Compares values against normal ranges  
✅ **Confidence Scoring** - Provides extraction quality metrics  
✅ **Async/Await** - Modern asynchronous implementation  
✅ **Production-Ready** - Clean, modular, and maintainable code  

## Architecture

```
smartMedicalExtractorV2(ocrText)
    ↓
Step 1: Load Dictionary (masterDictionary.json)
    ↓
Step 2: Detect Report Type (reportTypeDetector)
    ↓
Step 3: Get Parameter Definitions for Report Type
    ↓
Step 4: Extract Parameters
    - Match display name (0.9 confidence)
    - Match synonyms (0.75 confidence)
    - Extract value and unit
    ↓
Step 5: Determine Status (High/Low/Normal)
    ↓
Step 6: Calculate Average Confidence
    ↓
Return Structured Result
```

## Usage

### Basic Usage

```javascript
const smartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');

const ocrText = `
  THYROID PROFILE TEST REPORT
  T3: 1.2 ng/mL
  T4: 8.5 µg/dL
  TSH: 2.5 mIU/L
`;

const result = await smartMedicalExtractorV2(ocrText);

console.log(result);
// {
//   reportType: 'THYROID',
//   parameters: [
//     {
//       code: 'FREE_T3',
//       displayName: 'Free T3',
//       value: 1.2,
//       unit: 'ng/mL',
//       status: 'Normal',
//       confidence: 0.9
//     },
//     ...
//   ],
//   averageConfidence: 0.85
// }
```

### Integration with Report Processing Service

The V2 extractor is integrated into `reportProcessingService.js` with three modes:

```bash
# V1 Mode - Proximity-based extraction only
EXTRACTION_MODE=V1 node server.js

# V2 Mode - Dictionary-based extraction only
EXTRACTION_MODE=V2 node server.js

# HYBRID Mode - Both extractors, choose best result
EXTRACTION_MODE=HYBRID node server.js
```

### HYBRID Mode Logic

In HYBRID mode, both V1 and V2 extractors run in parallel. The system chooses the better result based on:

1. **Parameter Count** (60% weight) - More extracted parameters is better
2. **Confidence Score** (40% weight) - Higher confidence is better

**Score Formula:**
```
score = (parameterCount × 0.6) + (averageConfidence × 0.4)
```

## Output Format

```javascript
{
  reportType: string,           // "THYROID", "LIPID", "CBC", "DIABETES", etc.
  parameters: [
    {
      code: string,              // Parameter code (e.g., "FREE_T3")
      displayName: string,       // Human-readable name (e.g., "Free T3")
      value: number,             // Extracted numeric value
      unit: string,              // Normalized unit (e.g., "ng/mL")
      status: string,            // "High", "Low", or "Normal"
      confidence: number         // 0.5 - 1.0 confidence score
    }
  ],
  averageConfidence: number      // Average confidence across all parameters
}
```

## Confidence Scoring

| Match Type | Confidence Score | Description |
|------------|-----------------|-------------|
| Exact Match | 0.9 | Display name matches exactly |
| Synonym Match | 0.75 | Synonym matches |
| Partial Match | 0.5 | Basic match found |
| High Quality | +0.1 bonus | Pattern 1 match (Label: Value Unit) |

## Status Determination

Parameters are automatically classified based on normal ranges:

- **Low** - Value < normalRange.min
- **High** - Value > normalRange.max  
- **Normal** - Within normal range

## Dependencies

- `./dictionary/dictionaryLoader` - Loads and caches masterDictionary.json
- `./reportTypeDetector` - Detects report type from OCR text
- `./normalizer` - Normalizes units to standard format

## Helper Functions

### `findReportTypeInDictionary(dictionary, reportTypeCode)`
Maps report type codes from detector to dictionary entries.

### `normalizeOcrText(text)`
Cleans and normalizes OCR text for better matching.

### `extractParameter(ocrText, paramCode, paramData)`
Extracts a single parameter using display name and synonyms.

### `findValueNearLabel(lowerText, label, originalText)`
Finds numeric values near parameter labels using multiple patterns.

### `determineStatus(value, normalRange)`
Determines if value is High/Low/Normal based on ranges.

### `calculateAverageConfidence(parameters)`
Computes average confidence across all extracted parameters.

## Error Handling

The extractor gracefully handles errors and returns a safe default:

```javascript
{
  reportType: 'UNKNOWN',
  parameters: [],
  averageConfidence: 0
}
```

Common error scenarios:
- Dictionary loading fails
- OCR text is empty or too short
- Report type not detected
- No matching parameters found

## Testing

Run the test script to see the extractor in action:

```bash
cd med_backend
node test_v2_extractor.js
```

The test script demonstrates extraction from various report types:
- Thyroid Profile
- Lipid Profile
- Blood Glucose
- Complete Blood Count (CBC)

## Performance

- **Dictionary Loading**: Cached after first load (O(1) subsequent calls)
- **Report Type Detection**: O(n) where n = number of report types
- **Parameter Extraction**: O(m) where m = number of parameters in report type
- **Overall**: Fast and efficient for production use

## Maintenance

To add new parameters or report types:

1. Update `masterDictionary.json` with new definitions
2. No code changes required - fully data-driven
3. Dictionary is automatically reloaded on service restart

## Best Practices

✅ Always use async/await when calling the extractor  
✅ Set `EXTRACTION_MODE` environment variable before starting server  
✅ Monitor console logs for debugging extraction issues  
✅ Use HYBRID mode for maximum accuracy  
✅ Keep masterDictionary.json up to date with medical standards  

## Troubleshooting

**No parameters extracted?**
- Check if report type is detected correctly
- Verify OCR text quality
- Ensure parameters exist in masterDictionary.json for that report type

**Wrong status determination?**
- Update normalRange in masterDictionary.json
- Ensure min/max values are correctly set

**Low confidence scores?**
- Improve OCR text quality
- Add more synonyms to masterDictionary.json
- Check for OCR text normalization issues
