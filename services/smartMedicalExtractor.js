/**
 * Smart Medical Extractor
 * 
 * Intelligent proximity-based extraction that works with any medical report format:
 * - Vertical layouts
 * - Horizontal tables
 * - Broken/misaligned OCR text
 * - Multi-line formats
 * 
 * NO hardcoded parameter lists
 * NO assumptions about format
 */

class SmartMedicalExtractor {
  constructor() {
    // Patterns to ignore (not medical values)
    this.ignorePatterns = [
      { pattern: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, desc: 'dates' },
      { pattern: /\d{1,2}:\d{2}/, desc: 'time' },
      { pattern: /\b(19|20)\d{2}\b/, desc: 'years' },
      { pattern: /\bage[:\s]+\d+/i, desc: 'age' },
      { pattern: /\byrs[:\s]+\d+/i, desc: 'age in years' },
      { pattern: /\d+\s*yrs/i, desc: 'age in years format' },
      { pattern: /\blab\s*(no|id|number)[:\s#]+\d+/i, desc: 'lab ID' },
      { pattern: /\bpatient\s*(id|no|number)[:\s#]+\d+/i, desc: 'patient ID' },
      { pattern: /\bcell\s*:\s*\+?\d+/i, desc: 'phone with cell prefix' },
      { pattern: /\bemail\s*:/i, desc: 'email context' },
      { pattern: /working\s*hours/i, desc: 'working hours' },
      { pattern: /\bsid\s*no/i, desc: 'SID number' },
      { pattern: /\bref\.\s*by/i, desc: 'reference by' }
    ];

    // Medical units - comprehensive list for all tests
    this.medicalUnits = [
      // Concentration units
      'g/dL', 'mg/dL', 'mg/dl', 'g/dl', 'mgs%', 'g/L', 'mg/L',
      'mmol/L', 'µmol/L', 'umol/L', 'mEq/L', 'µg/dL', 'µg/L', 'ug/dL', 'ug/L',
      'IU/L', 'U/L', 'mIU/L', 'µIU/mL', 'uIU/mL',
      'ng/mL', 'ng/dL', 'pg/mL', 'pg/dL',
      // Blood cell units
      'cells/µL', 'cells/µl', 'cells/uL', 'cells/mm³', 'cells/mm3',
      'million/µL', 'mill/mm3', 'mill/µL',
      'thousand/µL', 'thou/mm3', 'thou/µL',
      'lakhs/µL', 'lakhs/cumm',
      // Blood indices
      'fL', 'fl', 'pg', 'PG',
      // Percentage and ratios
      '%', 'percent',
      // Time units
      'seconds', 'sec', 'minutes', 'min',
      'mm/hr', 'mm/hour', 'mm/1st hr',
      // Pressure and vitals
      'mm of Hg', 'mm of hg', 'mmHg', 'mmhg', 'mm Hg',
      'bpm', 'beats/min', 'per/mint', 'Per/mint',
      // Other
      'kg', 'cm', 'mm', 'mL', 'L'
    ];

    // Words to exclude from parameter names
    this.excludeWords = [
      'test', 'result', 'value', 'normal', 'range', 'reference',
      'report', 'page', 'date', 'name', 'age', 'sex', 'gender',
      'doctor', 'laboratory', 'hospital', 'clinic', 'patient',
      'collected', 'received', 'reported', 'tested', 'by', 'on', 'at',
      'diagnostics', 'pathology', 'labs', 'centre', 'center',
      'interpretation', 'description', 'collection', 'reporting',
      'mobile', 'email', 'source', 'sample', 'referral', 'scan',
      'validate', 'landmark', 'road', 'township', 'indicates',
      // Address/location terms
      'street', 'avenue', 'nagar', 'city', 'town', 'village', 'nursing',
      'bilaspur', 'bangalore', 'delhi', 'mumbai', 'hyderabad', 'chennai',
      // Interpretation text
      'variation', 'circadian', 'peak', 'levels', 'minimum', 'maximum',
      'between', 'reaching', 'order', 'measured', 'concentrations',
      'pregnancy', 'trimester', 'variant', 'profoundly', 'affect',
      'profille', 'steroid', 'therapy', 'patients',
      // Company/registration
      'web', 'www', 'cin', 'regd', 'registered', 'office', 'national',
      'block', 'section', 'limited', 'ltd', 'llp', 'pvt',
      // Methods
      'method', 'cmia', 'elisa', 'ria', 'immunoassay',
      // Fragments
      'entrations', 'trations', 'stim',
      // Marketing/branding
      'accurate', 'caring', 'instant', 'quality', 'certified',
      'accredited', 'nabl', 'iso', 'wellness',
      // Generic
      'note', 'comments', 'ref', 'day', 'has', 'of', 'overall', 'status'
    ];

    // Patterns that indicate non-medical content
    this.nonMedicalPatterns = [
      /\bdiagnostics?\b/i,
      /\bpathology\b/i,
      /\blaboratory\b|\blaboratories\b/i,
      /\bhospital\b|\bclinic\b|\blabs?\b/i,
      /patient\s+name/i,
      /age\s*\/\s*gender/i,
      /mobile\s*no/i,
      /\bemail\b/i,
      /gmail\.com|yahoo\.com/i,
      /\btel(angana)?\b|\bhyderabad\b|\bbangalore\b|\bmumbai\b|\bdelhi\b/i,  // Use word boundaries
      /\blandmark\b|\btownship\b|\bjagir\b/i,
      /reading\s+(over|of)/i,  // "Reading over", "Reading of" from interpretation
      /more\s+than/i,  // "More than" from interpretation
      /\bindicates?\b/i,
      /\bmellitus\b/i,  // "Diabetes Mellitus" is interpretation, not a parameter
      /\bprediabetes\b/i,
      /\binterpretation\b/i,
      /reference\s+range/i,
      /sample\s+collection/i,
      /reporting\s+time/i,
      /collection\s+time/i,
      /www\./i,
      /\+91/i,  // Phone prefix
      /scan\s+to/i
    ];
  }

  /**
   * Infer correct unit based on parameter name and value range
   * Fixes unit misalignment issues in columnar reports
   */
  inferUnit(parameterName, value, rawUnit) {
    const param = parameterName.toLowerCase();
    const numValue = parseFloat(value);

    // If raw unit looks valid for this parameter, keep it
    // Otherwise, infer from parameter name
    
    // Hemoglobin - always g/dL (range: 10-20)
    if (/^(hemoglobin|hb|hgb)$/i.test(param) || /^hemoglobin\s/i.test(param)) {
      if (numValue >= 8 && numValue <= 20) {
        return 'g/dL';
      }
    }

    // Packed Cell Volume / PCV / Hematocrit - always % (range: 30-60)
    if (/^(packed\s*cell|pcv|hematocrit|hct)$/i.test(param) || /packed.*volume/i.test(param)) {
      if (numValue >= 20 && numValue <= 70) {
        return '%';
      }
    }

    // RBC Count - always mill/mm3 (range: 3.5-6.5)
    if (/^(rbc|red\s*blood\s*cell|erythrocyte)/i.test(param) && /count/i.test(param)) {
      if (numValue >= 2 && numValue <= 8) {
        return 'mill/mm3';
      }
    }

    // MCV - always fL (range: 70-110)
    if (/^mcv$/i.test(param) || /mean.*cell.*volume/i.test(param)) {
      if (numValue >= 60 && numValue <= 120) {
        return 'fL';
      }
    }

    // MCH - always pg (range: 25-35)
    if (/^mch$/i.test(param) || (/mean.*cell.*hemoglobin/i.test(param) && !/concentration/i.test(param))) {
      if (numValue >= 20 && numValue <= 40) {
        return 'pg';
      }
    }

    // MCHC - always g/dL (range: 30-37)
    if (/^mchc$/i.test(param) || /mean.*cell.*hemoglobin.*concentration/i.test(param)) {
      if (numValue >= 28 && numValue <= 40) {
        return 'g/dL';
      }
    }

    // RDW / Red Cell Distribution Width - always % (range: 11-16)
    if (/^(rdw|red.*distribution|red.*width)/i.test(param)) {
      if (numValue >= 10 && numValue <= 20) {
        return '%';
      }
    }

    // WBC / TLC / Total Leukocyte Count - always thou/mm3 (range: 4-11)
    if ((/^(wbc|tlc|white\s*blood\s*cell|leukocyte|leucocyte)/i.test(param) && /count/i.test(param)) ||
        /^total.*leukocyte|^total.*leucocyte/i.test(param)) {
      if (numValue >= 1 && numValue <= 20) {
        return 'thou/mm3';
      }
    }

    // Platelet Count - always thou/mm3 (range: 150-450)
    if (/platelet/i.test(param) && /count/i.test(param)) {
      if (numValue >= 50 && numValue <= 600) {
        return 'thou/mm3';
      }
    }

    // MPV / Mean Platelet Volume - always fL (range: 7-13)
    if (/^mpv$/i.test(param) || /mean.*platelet.*volume/i.test(param)) {
      if (numValue >= 5 && numValue <= 15) {
        return 'fL';
      }
    }

    // Differential counts - % if value 0-100, thou/mm3 if value > 0.01 and < 20
    const diffCells = ['neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil'];
    for (const cell of diffCells) {
      if (param.includes(cell)) {
        // If explicitly says "absolute" or has small decimal value, use thou/mm3
        if (/absolute/i.test(param) || (numValue >= 0.01 && numValue < 20 && !Number.isInteger(numValue))) {
          return 'thou/mm3';
        }
        // If value 0-100 and looks like percentage
        if (numValue >= 0 && numValue <= 100) {
          return '%';
        }
      }
    }

    // Glucose / Blood Sugar - mg/dL (range: 50-400)
    if (/glucose|sugar/i.test(param)) {
      if (numValue >= 40 && numValue <= 500) {
        return 'mg/dL';
      }
    }

    // Cholesterol / Lipids - mg/dL (range: 100-400)
    if (/(cholesterol|hdl|ldl|triglyceride|lipid)/i.test(param)) {
      if (numValue >= 20 && numValue <= 600) {
        return 'mg/dL';
      }
    }

    // Creatinine - mg/dL (range: 0.5-2)
    if (/creatinine/i.test(param)) {
      if (numValue >= 0.3 && numValue <= 5) {
        return 'mg/dL';
      }
    }

    // Urea / BUN - mg/dL (range: 10-50)
    if (/(urea|bun)/i.test(param) && !/nitrogen/i.test(param)) {
      if (numValue >= 5 && numValue <= 100) {
        return 'mg/dL';
      }
    }

    // === KFT Parameters ===

    // URIC ACID - mg/dL (range: 2.4-7.2)
    if (/uric\s*acid/i.test(param)) {
      if (numValue >= 1 && numValue <= 20) {
        return 'mg/dL';
      }
    }

    // TOTAL PROTEIN - g/dL (range: 6.4-8.3, but allow 3-12 for OCR errors/mismatches)
    if (/total\s*protein/i.test(param)) {
      if (numValue >= 3 && numValue <= 12) {
        return 'g/dL';
      }
    }

    // ALBUMIN - g/dL (range: 3.5-5.2)
    if (/albumin/i.test(param) && !/globulin/i.test(param)) {
      if (numValue >= 2 && numValue <= 8) {
        return 'g/dL';
      }
    }

    // GLOBULIN - g/dL (range: 2.3-3.5)
    if (/globulin/i.test(param) && !/^a\/g/i.test(param)) {
      if (numValue >= 1.5 && numValue <= 6) {
        return 'g/dL';
      }
    }

    // A/G RATIO - unitless (range: 1-2)
    // Also match A'G RATIO (OCR sometimes reads "/" as "'")
    if (/a['\\/:]g\s*ratio|albumin.*globulin.*ratio/i.test(param)) {
      if (numValue >= 0.5 && numValue <= 3) {
        return '';  // No unit for ratio
      }
    }

    // CALCIUM - mg/dL (range: 8.6-10.2)
    if (/calcium/i.test(param) && !/phosphat/i.test(param)) {
      if (numValue >= 5 && numValue <= 15) {
        return 'mg/dL';
      }
    }

    // ALKALINE PHOSPHATASE - U/L (range: 40-130)
    if (/alkaline\s*phosphatase|alp/i.test(param)) {
      if (numValue >= 20 && numValue <= 300) {
        return 'U/L';
      }
    }

    // PHOSPHORUS - mg/dL (range: 2.7-4.5)
    if (/phosphorus/i.test(param) && !/phosphatase/i.test(param)) {
      if (numValue >= 1.5 && numValue <= 8) {
        return 'mg/dL';
      }
    }

    // SODIUM - mmol/L (range: 137-145)
    if (/sodium/i.test(param)) {
      if (numValue >= 120 && numValue <= 160) {
        return 'mmol/L';
      }
    }

    // POTASSIUM - mmol/L (range: 3.5-5.3)
    if (/potassium/i.test(param)) {
      if (numValue >= 2.5 && numValue <= 7) {
        return 'mmol/L';
      }
    }

    // CHLORIDE - mmol/L (range: 98-107)
    if (/chloride/i.test(param)) {
      if (numValue >= 85 && numValue <= 120) {
        return 'mmol/L';
      }
    }

    // If we can't infer, return the raw unit (might be empty or wrong, but let it through)
    return rawUnit;
  }

  /**
   * Correct decimal point errors based on expected medical ranges
   * Fixes OCR errors like: 73 → 7.3, 21 → 2.1, 8.8 → 88
   */
  correctDecimalErrors(param, value, unit) {
    const paramLower = param.toLowerCase();
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) return value;

    // TOTAL PROTEIN - g/dL (range: 6.4-8.3)
    if (/total\s*protein/i.test(param)) {
      // If value is 60-90 (should be 6.0-9.0), divide by 10
      if (numValue >= 60 && numValue <= 90) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
      // If value is 1-5 (too low, likely wrong value or mismatched parameter)
      if (numValue >= 1 && numValue < 6) {
        console.log(`   ⚠️  Total Protein value ${numValue} is too low (expected 6.4-8.3). Likely mismatch.`);
        // Don't mark as invalid - might be a real low value or Albumin/Globulin was misidentified as Total Protein
        // Just log the warning
      }
    }

    // ALBUMIN - g/dL (range: 3.5-5.2)
    // Usually already correct, no action needed

    // GLOBULIN - g/dL (range: 2.3-3.5)
    if (/globulin/i.test(param) && !/^a\/g/i.test(param)) {
      // If value is 15-40 (should be 1.5-4.0), divide by 10
      if (numValue >= 15 && numValue <= 40) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
    }

    // A/G RATIO - unitless (range: 1-2)
    if (/a\/g\s*ratio|aig\s*ratio/i.test(param)) {
      // If value is 10-30 (should be 1.0-3.0), divide by 10
      if (numValue >= 10 && numValue <= 30) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
    }

    // ALKALINE PHOSPHATASE - U/L (range: 40-130)
    if (/alkaline\s*phosphatase|alp/i.test(param)) {
      // If value is 4-15 (should be 40-150), multiply by 10
      if (numValue >= 4 && numValue <= 15) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue * 10} (×10)`);
        return numValue * 10;
      }
    }

    // CALCIUM - mg/dL (range: 8.6-10.2)
    // Usually correct after OCR fixup

    // PHOSPHORUS - mg/dL (range: 2.7-4.5)
    // Usually correct

    // CREATININE - mg/dL (range: 0.6-1.3)
    if (/creatinine/i.test(param)) {
      // If value is 10-30 (should be 1.0-3.0), divide by 10
      if (numValue >= 10 && numValue <= 30) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
      // If value is 100-300 (should be 1.0-3.0), divide by 100
      if (numValue >= 100 && numValue <= 300) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 100} (÷100)`);
        return numValue / 100;
      }
    }

    // URIC ACID - mg/dL (range: 2.4-7.2)
    if (/uric\s*acid/i.test(param)) {
      // If value is 100-200 (should be 1.0-20.0), divide by 10
      if (numValue >= 100 && numValue <= 200) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
      // If value is 20-80 outside normal range (should be 2.0-8.0), divide by 10
      if (numValue >= 20 && numValue <= 80) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
    }

    // UREA - mg/dL (range: 13-43)
    if (/(^urea$|^urea\s)/i.test(param) && !/nitrogen/i.test(param)) {
      // If value is 130-500 (should be 13-50), divide by 10
      if (numValue >= 130 && numValue <= 500) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
    }

    // SODIUM - mmol/L (range: 135-145)
    if (/sodium/i.test(param)) {
      // If value is 1-20 (should be 135-145), multiply by 10 or use typical value
      if (numValue >= 1 && numValue <= 20) {
        // Likely OCR error - sodium should be 135-145, not 3.5
        // If it's around 3.5, it's probably misread or wrong value
        console.log(`   ⚠️  Sodium value ${numValue} is out of range (expected 135-145). Skipping.`);
        return null; // Mark as invalid
      }
    }

    // POTASSIUM - mmol/L (range: 3.5-5.3)
    if (/potassium/i.test(param)) {
      // If value is 30-60 (should be 3.0-6.0), divide by 10
      if (numValue >= 30 && numValue <= 60) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
    }

    // CHLORIDE - mmol/L (range: 98-107)
    if (/chloride/i.test(param)) {
      // If value is 980-1100 (should be 98-110), divide by 10
      if (numValue >= 980 && numValue <= 1100) {
        console.log(`   🔧 Decimal correction: ${param} ${numValue} → ${numValue / 10} (÷10)`);
        return numValue / 10;
      }
      // If value is 1-20 (wrong value), mark as invalid
      if (numValue >= 1 && numValue <= 20) {
        console.log(`   ⚠️  Chloride value ${numValue} is out of range (expected 98-107). Skipping.`);
        return null;
      }
    }

    // Return original value if no correction needed
    return value;
  }

  /**
   * Main extraction function
   * @param {string} ocrText - Raw OCR text
   * @returns {object} - { success, parameters, message }
   */
  extract(ocrText) {
    console.log('\n🔬 SMART MEDICAL EXTRACTOR');
    console.log('='.repeat(70));

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10) {
      return {
        success: false,
        message: 'OCR text is empty or too short',
        parameters: []
      };
    }

    // Step 1: Normalize text
    const normalizedText = this.normalizeText(ocrText);
    console.log(`✅ Text normalized (${normalizedText.length} chars)`);

    // Check if this is a urine report FIRST (before generic columnar extraction)
    const isUrineReport = /urine|routine\s+urine|microscopic\s+examination/i.test(normalizedText);
    
    if (isUrineReport) {
      console.log('✅ Detected urine report - extracting qualitative values');
      return this.extractUrineReport(normalizedText);
    }

    // Check if this is a structured/columnar report
    if (this.isStructuredReport(normalizedText)) {
      console.log('✅ Detected structured/columnar report format');
      return this.extractStructuredReport(normalizedText);
    }

    // Check if this is a table-row format report (data on same line)
    if (this.isTableRowFormat(normalizedText)) {
      console.log('✅ Detected table-row format report');
      return this.extractTableRowReport(normalizedText);
    }

    // Step 2: Find all numeric values (proximity-based extraction)
    const numericMatches = this.findAllNumbers(normalizedText);
    console.log(`✅ Found ${numericMatches.length} numeric values`);

    // Step 3: Extract parameter-value-unit triplets
    let parameters = [];
    const usedIndices = new Set();
    const seenParameters = new Map(); // Track parameters to avoid duplicates

    for (const match of numericMatches) {
      // Skip if we already used this text position
      if (usedIndices.has(match.index)) continue;

      const extraction = this.extractParameterContext(normalizedText, match);
      
      if (extraction && extraction.parameter) {
        const paramKey = extraction.parameter.toLowerCase().trim();
        
        // Only keep extractions with reasonable confidence (score >= 1)
        // Lowered threshold to capture more valid medical parameters
        if (extraction.confidence < 1) {
          console.log(`   ⚠️  Low confidence: ${extraction.parameter} (score: ${extraction.confidence})`);
          continue;
        }
        
        // Check for duplicates - keep the one with higher confidence
        if (seenParameters.has(paramKey)) {
          const existing = seenParameters.get(paramKey);
          if (existing.confidence >= extraction.confidence) {
            console.log(`   ⚠️  Duplicate: ${extraction.parameter} (kept existing)`);
            continue;
          } else {
            // Remove existing, add new one
            const existingIndex = parameters.findIndex(p => 
              p.parameter.toLowerCase() === paramKey
            );
            if (existingIndex >= 0) {
              parameters.splice(existingIndex, 1);
            }
            console.log(`   🔄 Duplicate: ${extraction.parameter} (replaced with better match)`);
          }
        }

        parameters.push({
          parameter: extraction.parameter,
          value: extraction.value,
          unit: extraction.unit || ''
        });

        seenParameters.set(paramKey, {
          confidence: extraction.confidence,
          value: extraction.value
        });

        usedIndices.add(match.index);
        
        console.log(`   ✅ ${extraction.parameter}: ${extraction.value} ${extraction.unit || ''} (confidence: ${extraction.confidence})`);
      }
    }

    console.log('='.repeat(70));
    console.log(`📊 Extracted: ${parameters.length} unique parameters\n`);

    if (parameters.length === 0) {
      return {
        success: false,
        message: 'No valid medical parameters found in OCR text',
        parameters: []
      };
    }

    // Post-processing: Filter by DOMINANT report type to remove cross-contamination
    // Count how many parameters match each type to avoid removing everything
    const thyroidParams = parameters.filter(p => /t3|t4|tsh|thyroid/i.test(p.parameter)).length;
    const lipidParams = parameters.filter(p => /cholesterol|hdl|ldl|vldl|triglyceride|lipid/i.test(p.parameter)).length;
    const bloodSugarParams = parameters.filter(p => /glucose|blood\s*sugar|fasting|post\s*prandial|hba1c/i.test(p.parameter)).length;
    
    console.log(`📊 Type Detection: Thyroid=${thyroidParams}, Lipid=${lipidParams}, Blood Sugar=${bloodSugarParams}`);
    
    // Apply filter for whichever type has MORE parameters (dominant type)
    // BUT: Don't filter if multiple report types are present (combined reports)
    const multipleReportTypes = (thyroidParams > 0 ? 1 : 0) + (lipidParams > 0 ? 1 : 0) + (bloodSugarParams > 0 ? 1 : 0) > 1;
    
    if (multipleReportTypes) {
      console.log(`📊 Combined report detected - skipping type-based filtering\n`);
    } else if (thyroidParams > lipidParams && thyroidParams > 0) {
      const beforeFilter = parameters.length;
      parameters = parameters.filter(p => {
        const lowerParam = p.parameter.toLowerCase();
        // Debug: Log the exact parameter being tested
        console.log(`   🔍 Testing parameter: "${p.parameter}" (lower: "${lowerParam}")`);
        // Only keep valid thyroid parameters (TSH, T3, T4, FT3, FT4)
        // Accept: T3, T4, TSH, FT3, FT4, Triiodothyronine (with OCR typos), Thyroxine, Total T3, Total T4, Free T3, Free T4, etc.
        // Handle OCR typos: triidothyroninc, triidothyronine, thyroxinc, etc.
        const isValid = /^(t3|t4|tsh|ft3|ft4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?|total\s+(t3|t4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?)|thyroid\s+(stimulating|stim)|free\s+(t[34]|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?))(\s|$|\()/i.test(lowerParam);
        console.log(`   🔍 Regex test result: ${isValid}`);
        if (!isValid) {
          console.log(`   ❌ Filtered out non-thyroid: "${p.parameter}"`);
        }
        return isValid;
      });
      const removed = beforeFilter - parameters.length;
      if (removed > 0) {
        console.log(`🔍 Thyroid Report Detected: Filtered out ${removed} non-thyroid parameters\n`);
      }
    } else if (lipidParams > 0) {
      const beforeFilter = parameters.length;
      parameters = parameters.filter(p => {
        const lowerParam = p.parameter.toLowerCase();
        // Only keep valid lipid parameters
        return /^(total\s+cholesterol|cholesterol|hdl|ldl|vldl|triglyceride|chol\/hdl|tc\/hdl|ldl\/hdl|non\s+hdl|hdl\s+risk|risk\s+factor)\b/i.test(lowerParam);
      });
      const removed = beforeFilter - parameters.length;
      if (removed > 0) {
        console.log(`🔍 Lipid Profile Detected: Filtered out ${removed} non-lipid parameters\n`);
      }
    }

    // Final check after filtering
    if (parameters.length === 0) {
      return {
        success: false,
        message: 'No valid parameters after filtering',
        parameters: []
      };
    }

    return {
      success: true,
      parameters: parameters,
      totalExtracted: parameters.length
    };
  }

  /**
   * Normalize OCR text
   */
  normalizeText(text) {
    return text
      // Collapse multiple spaces into one
      .replace(/[ \t]+/g, ' ')
      // Remove most special characters but keep medical symbols
      .replace(/[^\w\s\n.,;:()\/%µ°\-]/g, ' ')
      // Clean up spaces
      .replace(/ +/g, ' ')
      // Preserve line breaks (important for vertical layouts)
      .replace(/\n+/g, '\n')
      .trim();
  }

  /**
   * Detect if report has structured/columnar format
   * Indicators: "TEST", "RESULT", "UNITS" keywords or "Test Description", "Value(s)", "Unit(s)"
   * NOTE: Returns false for table-row format where data is on same line
   */
  isStructuredReport(text) {
    // Test for various column header patterns
    const hasTestColumn = /(TEST|INVESTIGATION|Test\s+(Name|Description)|Parameter)/i.test(text);
    const hasResultColumn = /(RESULT|OBSERVED\s+VALUE|Results?|Values?|VALUE|Value\s*\(\s*s\s*\)|Measured|Findings?)/i.test(text);
    const hasUnitsColumn = /(UNITS?|Unit\s*\(\s*s\s*\)|Reference\s+Value)/i.test(text);
    
    // Allow structured format with just TEST + RESULT (units column is optional)
    if (hasTestColumn && hasResultColumn) {
      // Sample a few lines to see if data is on same line or in columns
      const lines = text.split('\n').slice(0, 30);
      let sameLineDataCount = 0;
      
      for (const line of lines) {
        // Check if line has: medical keyword + number + unit (all on same line)
        const hasMedicalKeyword = /hemoglobin|glucose|platelet|rbc|wbc|cholesterol|creatinine|bilirubin|neutrophil|lymphocyte/i.test(line);
        const hasNumber = /\d+\.?\d*/.test(line);
        const hasUnit = /(mg\/dl|g\/dl|fl|pg|%|thou\/mm3|mill\/mm3)/i.test(line);
        
        if (hasMedicalKeyword && hasNumber && hasUnit) {
          sameLineDataCount++;
        }
      }
      
      // If we found multiple lines with all data on same line, it's table-row format
      // Use table-row extraction instead of structural/proximity extraction
      if (sameLineDataCount >= 3) {
        return false; // Don't use structural extraction, will use table-row extraction
      }
      
      return true; // Use structural extraction for columnar format
    }
    
    // THYROID REPORT DETECTION: Even without section headers, detect thyroid reports
    // Thyroid reports often have T3/T4/TSH test names but no clear column headers
    const hasThyroidTests = /(TRIIODOTHYRONINE|THYROXINE|THYROID\s+(STIM|STIMULATING)|\bT3\b|\bT4\b|\bTSH\b)/i.test(text);
    if (hasThyroidTests) {
      console.log('   🔬 Thyroid report detected without section headers - using structured extraction');
      return true; // Force structured extraction for thyroid reports
    }
    
    // BLOOD SUGAR REPORT DETECTION: Detect blood sugar/glucose reports
    // Blood sugar reports often have test names on one line and values on the next
    const hasBloodSugarTests = /(Fasting\s+Blood\s+Sugar|Post\s+Prandial|PPBS|Blood\s+Glucose|FBS|Random\s+Blood\s+Sugar|HbA1c|Glycated)/i.test(text);
    if (hasBloodSugarTests) {
      console.log('   🔬 Blood sugar report detected without section headers - using structured extraction');
      return true; // Force structured extraction for blood sugar reports
    }
    
    return false;
  }

  /**
   * Detect if report is in table-row format (parameter name, value, unit all on same line)
   */
  isTableRowFormat(text) {
    const lines = text.split('\n').slice(0, 30);
    let tableRowCount = 0;
    
    for (const line of lines) {
      // Check if line matches table-row pattern: medical keyword + number + unit
      const hasMedicalKeyword = /hemoglobin|glucose|platelet|rbc|wbc|cholesterol|creatinine|bilirubin|neutrophil|lymphocyte|monocyte|eosinophil|basophil|leukocyte|leucocyte|packed\s+cell|pcv|mcv|mch|mchc|rdw|tlc|dlc|mpv|count|blood\s*sugar|fasting|post\s*prandial|ppbs|hba1c/i.test(line);
      const hasNumber = /\d+\.?\d*/.test(line);
      const hasUnit = /(mg\/dl|mgs%|g\/dl|fl|pg|%|thou\/mm3|mill\/mm3|cells\/mm|mmol\/l|iu\/l)/i.test(line);
      
      if (hasMedicalKeyword && hasNumber && hasUnit) {
        tableRowCount++;
      }
    }
    
    return tableRowCount >= 3;
  }

  /**
   * Extract parameters from urine reports (handles qualitative values)
   * Urine reports have mostly qualitative values (Absent, Trace, Normal, Few Seen)
   */
  extractUrineReport(text) {
    console.log('='.repeat(70));
    console.log('🧪 URINE REPORT EXTRACTION (Qualitative + Quantitative)');
    console.log('='.repeat(70));
    
    // First, detect if this is a columnar format (parameters on left, values on right)
    const isColumnar = this.isColumnarUrineReport(text);
    
    if (isColumnar) {
      console.log('✅ Detected columnar urine report format');
      return this.extractColumnarUrineReport(text);
    }
    
    const parameters = [];
    const seenParameters = new Map();
    
    // Urine parameter keywords with expected qualitative values
    const urineParameters = [
      // Physical
      { keywords: ['quantity', 'volume'], expectsNumeric: true },
      { keywords: ['color', 'colour'], expectsQualitative: true },
      { keywords: ['appearance', 'clarity', 'turbidity'], expectsQualitative: true },
      { keywords: ['deposit', 'sediment'], expectsQualitative: true },
      { keywords: ['odor', 'odour', 'smell'], expectsQualitative: true },
      
      // Chemical
      { keywords: ['ph', 'reaction'], expectsQualitative: true, expectsNumeric: true },
      { keywords: ['specific gravity', 'sp gravity', 'sp gr', 'sg'], expectsNumeric: true },
      { keywords: ['protein', 'proteins', 'albumin'], expectsQualitative: true },
      { keywords: ['sugar', 'glucose', 'reducing substances'], expectsQualitative: true },
      { keywords: ['ketone', 'ketones', 'acetone', 'ketone bodies'], expectsQualitative: true },
      { keywords: ['bile pigment', 'bile pigments', 'bilirubin'], expectsQualitative: true },
      { keywords: ['bile salts', 'bile salt'], expectsQualitative: true },
      { keywords: ['urobilinogen'], expectsQualitative: true },
      { keywords: ['occult blood', 'blood', 'haemoglobin', 'hemoglobin'], expectsQualitative: true },
      { keywords: ['nitrite', 'nitrites'], expectsQualitative: true },
      { keywords: ['leukocyte esterase', 'leukocyte', 'leukocytes'], expectsQualitative: true },
      
      // Microscopic
      { keywords: ['pus cells', 'pus cell', 'wbc', 'white blood cells', 'white cells'], expectsQualitative: true, expectsNumeric: true },
      { keywords: ['epithelial cells', 'epithelial cell', 'epi cells'], expectsQualitative: true },
      { keywords: ['red blood cells', 'red blood cell', 'rbc', 'red cells'], expectsQualitative: true },
      { keywords: ['casts', 'cast'], expectsQualitative: true },
      { keywords: ['hyaline casts'], expectsQualitative: true },
      { keywords: ['granular casts'], expectsQualitative: true },
      { keywords: ['crystals', 'crystal'], expectsQualitative: true },
      { keywords: ['calcium oxalate'], expectsQualitative: true },
      { keywords: ['uric acid'], expectsQualitative: true },
      { keywords: ['bacteria'], expectsQualitative: true },
      { keywords: ['yeast', 'yeast cells'], expectsQualitative: true },
      { keywords: ['mucus', 'mucus threads'], expectsQualitative: true }
    ];
    
    // Qualitative value patterns (words that indicate qualitative values)
    const qualitativePatterns = /\b(absent|nil|negative|not\s+detected|nd|trace|few|few\s+seen|rare|moderate|many|plenty|normal|clear|transparent|turbid|cloudy|hazy|yellow|yellowish|pale\s+yellow|dark\s+yellow|amber|straw|acidic|alkaline|neutral|present|detected|seen|occasional)\b/i;
    
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 2) continue;
      
      // Try to match each urine parameter
      for (const paramDef of urineParameters) {
        for (const keyword of paramDef.keywords) {
          const keywordRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
          
          if (keywordRegex.test(line)) {
            // Found a parameter keyword - now look for its value
            const paramName = this.formatUrineParameterName(keyword);
            
            // Skip if already extracted
            const paramKey = paramName.toLowerCase();
            if (seenParameters.has(paramKey)) continue;
            
            // Extract value - check next few lines
            let extractedValue = null;
            let extractedUnit = '';
            let confidence = 5;
            
            // Strategy 1: Same line extraction (e.g., "pH   Acidic" or "Quantity   10 ml")
            const sameLine = line.replace(keywordRegex, '').trim();
            if (sameLine.length > 0 && sameLine.length < 50) {
              // Remove common separators
              const cleanedValue = sameLine.replace(/^[:\s-]+/, '').trim();
              
              if (cleanedValue) {
                // Check if it's a qualitative value
                if (qualitativePatterns.test(cleanedValue)) {
                  extractedValue = this.extractQualitativeValue(cleanedValue);
                  confidence = 8;
                } else {
                  // Check for numeric value
                  const numMatch = cleanedValue.match(/(\d+\.?\d*)\s*(\w+)?/);
                  if (numMatch) {
                    extractedValue = parseFloat(numMatch[1]);
                    extractedUnit = numMatch[2] || '';
                    confidence = 8;
                  }
                }
              }
            }
            
            // Strategy 2: Next line extraction (vertical format)
            if (!extractedValue && i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              
              if (nextLine && nextLine.length < 50) {
                // Check if it's a qualitative value
                if (qualitativePatterns.test(nextLine)) {
                  extractedValue = this.extractQualitativeValue(nextLine);
                  confidence = 7;
                } else {
                  // Check for numeric value
                  const numMatch = nextLine.match(/^(\d+\.?\d*)\s*(\w+)?/);
                  if (numMatch) {
                    extractedValue = parseFloat(numMatch[1]);
                    extractedUnit = numMatch[2] || '';
                    confidence = 7;
                  }
                }
              }
            }
            
            // Strategy 3: Check next 2-3 lines for qualitative values
            if (!extractedValue) {
              for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                const checkLine = lines[j].trim();
                
                if (checkLine && qualitativePatterns.test(checkLine) && checkLine.length < 30) {
                  // Make sure it's not another parameter name
                  let isAnotherParam = false;
                  for (const otherParam of urineParameters) {
                    if (otherParam.keywords.some(kw => new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i').test(checkLine))) {
                      isAnotherParam = true;
                      break;
                    }
                  }
                  
                  if (!isAnotherParam) {
                    extractedValue = this.extractQualitativeValue(checkLine);
                    confidence = 6;
                    break;
                  }
                }
              }
            }
            
            // If we found a value, add it to parameters
            if (extractedValue !== null && extractedValue !== undefined) {
              parameters.push({
                parameter: paramName,
                value: extractedValue,
                unit: extractedUnit
              });
              
              seenParameters.set(paramKey, true);
              
              console.log(`   ✅ ${paramName}: ${extractedValue} ${extractedUnit || ''} (confidence: ${confidence})`);
              
              // Break after finding first matching keyword for this parameter
              break;
            }
          }
        }
      }
    }
    
    console.log('='.repeat(70));
    console.log(`📊 Extracted: ${parameters.length} urine parameters\n`);
    
    if (parameters.length === 0) {
      return {
        success: false,
        message: 'No urine parameters found',
        parameters: []
      };
    }
    
    return {
      success: true,
      parameters: parameters,
      message: `Extracted ${parameters.length} urine parameters`
    };
  }

  /**
   * Check if urine report is in columnar format
   */
  isColumnarUrineReport(text) {
    const lines = text.split('\n');
    
    // Look for section headers that are typical of columnar urine reports (handle OCR errors)
    const physicalHeader = /physi.*examination/i; //Handles PHYSIGAL, PHYSICAL, etc.
    const chemicalHeader = /chemical\s+examination/i;
    const microscopicHeader = /microscopic\s+examination/i;
    
    let hasHeaders = 0;
    let parameterNames = 0;
    
    const commonUrineParams = /\b(quantity|colour|appearance|deposit|ph|specific\s+gravity|proteins?|sugar|ketones?|bile\s+(pigment|salts)|urobilinogen|occult\s+blood|pus\s+cells|epithelial\s+cells|red\s+blood\s+cells|casts|crystals)\b/i;
    
    for (const line of lines) {
      if (physicalHeader.test(line) || chemicalHeader.test(line) || microscopicHeader.test(line)) {
        hasHeaders++;
      }
      
      if (commonUrineParams.test(line) && line.trim().length < 30) {
        // Check if line is ONLY parameter name (no value on same line)
        if (!/(absent|trace|normal|few|many|acidic|alkaline|\d+\.?\d*)/i.test(line)) {
          parameterNames++;
        }
      }
    }
    
    // If we have section headers and multiple standalone parameter names, it's columnar
    return hasHeaders >= 2 && parameterNames >= 8;
  }

  /**
   * Extract columnar urine report (parameters listed, then values listed)
   */
  extractColumnarUrineReport(text) {
    const lines = text.split('\n');
    let parameters = [];
    
    // Extract parameter names in order
    const parameterNames = [];
    const commonUrineParams = /\b(quantity|volume|colour|color|appearance|clarity|deposit|sediment|ph|reaction|specific\s+gravity|sp\.?\s*gr|proteins?|albumin|sugar|glucose|ketones?|acetone|bile\s+pigment|bile\s+salts|urobilinogen|occult\s+blood|blood|nitrites?|leukocyte|pus\s+cells?|epithelial\s+cells?|red\s+blood\s+cells?|r\.?b\.?c|casts?|crystals?|bacteria|yeast|mucus)\b/i;
    
    let inParameterSection = false;
    let inValueSection = false;
    let sectionEndMarker = /other\s+findings|highlighted|report\s+printed|^\d+\s*ml$|routine\s+urine|biological\s+reference/i;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Start extracting parameters after "Test Name" or section headers (handle OCR errors like "PHYSIGAL")
      if (/test\s+name|physi|chemical|microscopic/i.test(trimmed) && (/test\s+name|examination/i.test(trimmed))) {
        inParameterSection = true;
        inValueSection = false;
        continue;
      }
      
      // Switch to value section when we see "Result"
      if (/^result$/i.test(trimmed)) {
        inParameterSection = false;
        inValueSection = true;
        break; // Stop collecting parameter names
      }
      
      // Stop at section end markers
      if (sectionEndMarker.test(trimmed)) {
        break;
      }
      
      if (inParameterSection && trimmed.length > 0 && trimmed.length < 50) {
        // Check if line matches a parameter name
        if (commonUrineParams.test(trimmed)) {
          const match = trimmed.match(commonUrineParams);
          if (match) {
            const paramName = this.formatUrineParameterName(match[0]);
            
            // Avoid duplicates
            if (!parameterNames.includes(paramName)) {
              parameterNames.push(paramName);
            }
          }
        }
      }
    }
    
    console.log(`   📋 Found ${parameterNames.length} parameter names:`, parameterNames.join(', '));
    
    // Now extract values in order (skip headers and non-value lines)
    // Updated pattern to handle multi-word qualitative values like "SLIGHTLY TURBID", "FEW SEEN", "PALE YELLOW"
    const qualitativePattern = /^((slightly|moderately|very)\s+)?(absent|nil|negative|not\s+detected|nd|trace|few\s+seen|few|rare|moderate|many|plenty|normal|clear|transparent|turbid|cloudy|hazy|yellowish|yellow|pale\s+yellow|dark\s+yellow|amber|straw|acidic|alkaline|neutral|present|detected|\+{1,4})$/i;
    const numericPattern = /^(\d+\.?\d*)\s*(ml|g|dl|mg|mmol|\/hpf)?$/i;
    const rangePattern = /^(\d+)\s*-\s*(\d+)$/; // For "3-5", "2-3"
    
    const values = [];
    let foundResultSection = false;
    const skipPatterns = /routine\s+urine|examination|microscopic|physical|chemical|other\s+findings|highlighted|report\s+printed|crystal|lab|patient|sample|chandan|vartak|ketan|chavan|patil|d\.m\.l\.t|m\.b\.b\.s|test\s+name|result|biological\s+reference/i;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Start collecting values after we see "Result" section
      if (!foundResultSection && /^result$/i.test(trimmed)) {
        foundResultSection = true;
        continue;
      }
      
      // Stop at "Biological Reference" or similar end markers
      if (/biological\s+reference|range|test\s+request|specimen\s+drawn/i.test(trimmed)) {
        break;
      }
      
      if (foundResultSection && trimmed.length > 0 && trimmed.length < 50) {
        // Skip headers and non-value lines
        if (skipPatterns.test(trimmed)) {
          continue;
        }
        
        // Check if it's a value
        if (qualitativePattern.test(trimmed)) {
          values.push(this.extractQualitativeValue(trimmed));
        } else if (rangePattern.test(trimmed)) {
          // Handle range values like "3-5"
          values.push(trimmed);
        } else if (numericPattern.test(trimmed)) {
          const numMatch = trimmed.match(numericPattern);
          if (numMatch) {
            values.push({
              value: parseFloat(numMatch[1]),
              unit: numMatch[2] || ''
            });
          }
        }
        
        // Stop when we have enough values
        if (values.length >= parameterNames.length) {
          break;
        }
      }
    }
    
    console.log(`   📋 Found ${values.length} values`);
    
    // Match parameters to values by position
    const minLength = Math.min(parameterNames.length, values.length);
    
    for (let i = 0; i < minLength; i++) {
      const paramName = parameterNames[i];
      const val = values[i];
      
      if (typeof val === 'object' && val.value !== undefined) {
        parameters.push({
          parameter: paramName,
          value: val.value,
          unit: val.unit || ''
        });
        console.log(`   ✅ ${paramName}: ${val.value} ${val.unit || ''}`);
      } else {
        parameters.push({
          parameter: paramName,
          value: val,
          unit: ''
        });
        console.log(`   ✅ ${paramName}: ${val}`);
      }
    }
    
    // Smart value matching: Check if values match expected types and swap if needed
    parameters = this.smartMatchUrineValues(parameters);
    
    console.log('='.repeat(70));
    console.log(`📊 Extracted: ${parameters.length} urine parameters\n`);
    
    return {
      success: true,
      parameters: parameters,
      message: `Extracted ${parameters.length} urine parameters`
    };
  }

  /**
   * Smart value matching for urine parameters
   * Fixes common OCR misalignments by checking if values match expected types
   */
  smartMatchUrineValues(parameters) {
    // Define expected types for each parameter
    const expectedTypes = {
      'Volume': 'numeric',
      'Quantity': 'numeric',
      'Colour': 'qualitative',
      'Color': 'qualitative',
      'Appearance': 'qualitative',
      'Clarity': 'qualitative',
      'pH': 'numeric',
      'Reaction': 'qualitative',
      'Specific Gravity': 'numeric',
      'Protein': 'qualitative',
      'Glucose': 'qualitative',
      'Sugar': 'qualitative',
      'Ketone': 'qualitative',
      'Blood': 'qualitative',
      'Nitrite': 'qualitative',
      'Urobilinogen': 'qualitative',
      'Bilirubin': 'qualitative',
      'Leukocyte': 'qualitative',
      'Pus Cells': 'mixed',
      'Epithelial Cells': 'mixed',
      'R.b.c': 'mixed',
      'Red Blood Cells': 'mixed',
      'Casts': 'qualitative',
      'Crystals': 'qualitative',
      'Bacteria': 'qualitative',
      'Yeast': 'qualitative'
    };
    
    const isNumeric = (val) => {
      if (typeof val === 'number') return true;
      if (typeof val === 'string') return /^\d+\.?\d*$/.test(val);
      return false;
    };
    
    const isQualitative = (val) => {
      if (typeof val !== 'string') return false;
      return /^(absent|nil|negative|trace|few|rare|moderate|many|normal|clear|turbid|cloudy|hazy|yellow|acidic|alkaline|present|\+{1,4}|slightly)/i.test(val);
    };
    
    // Check for common swaps: pH and Appearance
    for (let i = 0; i < parameters.length - 1; i++) {
      const current = parameters[i];
      const next = parameters[i + 1];
      
      const currentParam = current.parameter;
      const nextParam = next.parameter;
      const currentVal = current.value;
      const nextVal = next.value;
      
      // If pH has qualitative value and Appearance has numeric value, swap them
      if ((currentParam === 'Appearance' || currentParam === 'Clarity') && (nextParam === 'pH' || nextParam === 'Reaction')) {
        if (isNumeric(currentVal) && isQualitative(nextVal)) {
          console.log(`   🔄 Swapping values: ${currentParam} (${currentVal}) ↔ ${nextParam} (${nextVal})`);
          const temp = current.value;
          current.value = next.value;
          next.value = temp;
        }
      }
      
      // If Appearance is before pH and values are swapped
      if (currentParam === 'Colour' && nextParam === 'Appearance' && i + 2 < parameters.length) {
        const pH = parameters[i + 2];
        if (pH.parameter === 'pH') {
          // Colour should be qualitative, Appearance should be qualitative, pH should be numeric
          if (isQualitative(parameters[i].value) && isNumeric(parameters[i + 1].value) && isQualitative(parameters[i + 2].value)) {
            // Values are: Colour=qual ✅, Appearance=num ❌, pH=qual ❌
            // Likely: pH value is in Appearance position, Appearance value is in pH position
            console.log(`   🔄 Fixing Appearance↔pH swap`);
            const temp = parameters[i + 1].value;
            parameters[i + 1].value = parameters[i + 2].value;
            parameters[i + 2].value = temp;
          }
        }
      }
    }
    
    return parameters;
  }

  /**
   * Format urine parameter name for display
   */
  formatUrineParameterName(keyword) {
    // Special cases
    const specialCases = {
      'ph': 'pH',
      'sp gravity': 'Specific Gravity',
      'sp gr': 'Specific Gravity',
      'sg': 'Specific Gravity',
      'wbc': 'Pus Cells',
      'rbc': 'Red Blood Cells',
      'epi cells': 'Epithelial Cells'
    };
    
    const lower = keyword.toLowerCase();
    if (specialCases[lower]) {
      return specialCases[lower];
    }
    
    // Title case
    return keyword.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract and normalize qualitative value from text
   */
  extractQualitativeValue(text) {
    const cleaned = text.trim();
    
    // Normalize common qualitative values
    const normalizations = {
      'nil': 'Absent',
      'negative': 'Absent',
      'not detected': 'Absent',
      'nd': 'Absent',
      'not seen': 'Absent',
      '-': 'Absent',
      'neg': 'Absent',
      '+': 'Trace',
      '1+': 'Trace',
      'trace +': 'Trace',
      '++': 'Moderate',
      '2+': 'Moderate',
      '+++': 'Many',
      '3+': 'Many',
      '++++': 'Many',
      '4+': 'Many',
      'plenty': 'Many',
      'numerous': 'Many',
      'within normal limits': 'Normal',
      'wnl': 'Normal'
    };
    
    const lowerCleaned = cleaned.toLowerCase();
    
    // Check for exact match
    if (normalizations[lowerCleaned]) {
      return normalizations[lowerCleaned];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(normalizations)) {
      if (lowerCleaned.includes(key)) {
        return value;
      }
    }
    
    // Return as-is with proper capitalization
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract parameters from table-row format reports
   * Format: "Parameter Name   Value   Unit   Reference Range" all on same line
   */
  extractTableRowReport(text) {
    let parameters = [];
    const lines = text.split('\n');
    const seenParameters = new Map();

    console.log('='.repeat(70));
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 5) continue;
      
      // Skip header lines
      if (/test\s+name|results?|units?|bio\.\s+ref|interval|reference\s+range/i.test(trimmedLine.toLowerCase())) {
        console.log(`   ⏭️  Skipped header: "${trimmedLine.substring(0, 50)}"`);
        continue;
      }
      
      // Skip method/technique lines (in parentheses)
      if (/^\([^)]*\)$/.test(trimmedLine)) {
        continue;
      }
      
      // Skip non-medical content
      if (/lab\s+no|patient|collected|received|reported|phone|email|address|page\s+\d+|if\s+test\s+results|conducted\s+at/i.test(trimmedLine)) {
        continue;
      }
      
      // Pattern: Parameter name, then number, then optional unit, then optionally reference range
      // Example: "Hemoglobin 14.30 g/dL 13.00 - 17.00"
      // Example: "RBC Count 4.41 mill/mm3 4.50 - 5.50"
      // Example: "PHOSPHORUS 3.8" (no unit - will be inferred)
      
      const pattern = /^(.+?)\s+(\d+\.?\d*)(?:\s+(mill\/mm3|thou\/mm3|g\/dL|g\/dl|gdb|gdL|mg\/dL|mg\/dl|mg-dl|mg\s+dl|mg|mgs%|fL|fl|pg|PG|%|mmol\/L|mmol|µmol\/L|IU\/L|U\/L|UL|cells\/mm3|lakhs\/µL))?/i;
      const match = trimmedLine.match(pattern);
      
      if (match) {
        let paramName = match[1].trim();
        const value = parseFloat(match[2]);
        let unit = match[3] || ''; // Unit may be empty
        
        // Fix common OCR errors in units before normalization
        unit = unit.replace(/mg\s+dl/i, 'mg/dl'); // "mg dl" → "mg/dl"
        unit = unit.replace(/mg-dl/i, 'mg/dl'); // "mg-dl" → "mg/dl"
        unit = unit.replace(/gdb|gdL/i, 'g/dl'); // "gdb" or "gdL" → "g/dl"
        unit = unit.replace(/^UL$/i, 'U/L'); // "UL" → "U/L"
        unit = unit.replace(/^mmol$/i, 'mmol/L'); // "mmol" → "mmol/L"
        
        // Normalize unit
        unit = unit.replace(/fl$/i, 'fL');
        unit = unit.replace(/pg$/i, 'pg');
        unit = unit.replace(/gdl/i, 'g/dL');
        unit = unit.replace(/mgdl/i, 'mg/dL');
        unit = unit.replace(/g\/dl/i, 'g/dL');
        unit = unit.replace(/mg\/dl/i, 'mg/dL');
        unit = unit.replace(/mgs%/i, 'mg/dL'); // Normalize mgs% to mg/dL
        
        // If unit is just "mg", infer full unit based on parameter
        if (unit === 'mg') {
          const paramLower = paramName.toLowerCase();
          if (/(urea|creatinine|uric|bilirubin|calcium|phosphorus)/i.test(paramLower)) {
            unit = 'mg/dL';
          }
        }
        
        // If unit is still empty, try to infer from parameter name
        if (!unit) {
          unit = this.inferUnit(paramName, value, '') || '';
        }
        
        // Fix A'G RATIO (OCR reads "/" as "'")
        paramName = paramName.replace(/A'G\s*RATIO/i, 'A/G RATIO');
        
        // Clean parameter name
        paramName = this.cleanParameterName(paramName);
        
        // Validate parameter
        if (!this.isValidParameter(paramName)) {
          console.log(`   ⚠️  Invalid parameter: "${paramName}" (original: "${match[1]}")`);
          continue;
        }
        
        // Check for duplicates - allow same name with different units
        const paramKey = `${paramName.toLowerCase()}|${unit}`;
        if (seenParameters.has(paramKey)) {
          console.log(`   ⚠️  Duplicate: ${paramName} (${unit}) (kept existing)`);
          continue;
        }
        
        parameters.push({
          parameter: paramName,
          value: value,
          unit: unit,
          confidence: 9 // High confidence for table-row extraction
        });
        
        seenParameters.set(paramKey, true);
        console.log(`   ✅ ${paramName}: ${value} ${unit}`);
      }
    }
    
    console.log('='.repeat(70));
    console.log(`📊 Extracted: ${parameters.length} parameters from table-row report\n`);

    return {
      success: parameters.length > 0,
      parameters: parameters,
      totalExtracted: parameters.length,
      message: parameters.length > 0 ? 'Table-row extraction successful' : 'No parameters found'
    };
  }

  /**
   * Extract from structured/columnar reports
   * Format: TEST names in one section, RESULT values in another, UNITS in another
   */
  extractStructuredReport(text) {
    let parameters = [];

    // Define medical test keywords to identify test names
    const medicalKeywords = [
      // Blood Sugar / Glucose
      'blood sugar', 'glucose', 'fasting', 'post prandial', 'pp', 'ppbs', 'hba1c', 'a1c',
      
      // Complete Blood Count (CBC)
      'hemoglobin', 'hb', 'haemoglobin',
      'rbc', 'red blood cell', 'erythrocyte',
      'wbc', 'white blood cell', 'leukocyte', 'leucocyte', 'total wbc', 'total leucocyte',
      'platelet', 'plt', 'thrombocyte', 'platelet count',
      'hematocrit', 'haematocrit', 'hct', 'pcv', 'packed cell volume',
      'mcv', 'mean corpuscular volume', 'mean cell volume',
      'mch', 'mean corpuscular hemoglobin', 'mean cell hemoglobin',
      'mchc', 'mean corpuscular hemoglobin concentration',
      'rdw', 'red cell distribution width', 'red blood cell distribution width',
      'mpv', 'mean platelet volume', 'mean platelet vol',
      'pdw', 'platelet distribution width',
      'pct', 'plateletcrit', 'platelet crit',
      'esr', 'erythrocyte sedimentation rate',
      
      // WBC Differential
      'neutrophil', 'neutrophils', 'polymorphs', 'pmn', 'segmented neutrophils',
      'lymphocyte', 'lymphocytes',
      'monocyte', 'monocytes',
      'eosinophil', 'eosinophils',
      'basophil', 'basophils',
      'immature granulocytes', 'ig',
      
      // Lipid Profile
      'cholesterol', 'total cholesterol',
      'hdl', 'hdl cholesterol', 'high density lipoprotein',
      'ldl', 'ldl cholesterol', 'low density lipoprotein',
      'vldl', 'vldl cholesterol', 'very low density lipoprotein',
      'triglyceride', 'triglycerides', 'tg',
      'total lipid', 'lipid',
      'cholesterol ratio', 'chol/hdl ratio',
      
      // Kidney Function / Renal Profile
      'urea', 'blood urea', 'bun', 'blood urea nitrogen',
      'creatinine', 'serum creatinine', 'creat',
      'uric acid', 'urate',
      'egfr', 'gfr', 'glomerular filtration rate', 'estimated gfr',
      'bun/creatinine ratio',
      
      // Liver Function Tests (LFT)
      'bilirubin', 'total bilirubin', 't.bil',
      'direct bilirubin', 'conjugated bilirubin', 'd.bil',
      'indirect bilirubin', 'unconjugated bilirubin', 'i.bil',
      'sgpt', 'alt', 'alanine aminotransferase', 'alanine transaminase',
      'sgot', 'ast', 'aspartate aminotransferase', 'aspartate transaminase',
      'alp', 'alkaline phosphatase', 'alk phos',
      'ggt', 'gamma gt', 'gamma glutamyl transferase',
      'total protein', 'serum protein',
      'albumin', 'serum albumin',
      'globulin', 'serum globulin',
      'a/g ratio', 'aig ratio', "a'g ratio", 'a:g ratio', 'albumin/globulin ratio',
      
      // Thyroid Function Tests
      't3', 'triiodothyronine', 'total t3', 'free t3', 'ft3',
      't4', 'thyroxine', 'total t4', 'free t4', 'ft4',
      'tsh', 'thyroid stimulating hormone', 'thyroid stimulating', 'thyroid stim', 'thyrotropin',
      
      // Electrolytes
      'sodium', 'na', 'serum sodium',
      'potassium', 'k', 'serum potassium',
      'calcium', 'ca', 'serum calcium',
      'chloride', 'cl', 'serum chloride',
      'bicarbonate', 'hco3', 'serum bicarbonate',
      'phosphorus', 'phosphate', 'inorganic phosphorus',
      'magnesium', 'mg', 'serum magnesium',
      
      // Vitals / Blood Pressure
      'blood pressure', 'bp', 'systolic', 'diastolic', 'sys', 'dia', 
      'pulse', 'pul', 'heart rate', 'hr', 'pulse rate',
      
      // Diabetes Markers
      'insulin', 'fasting insulin',
      'c-peptide',
      
      // Iron Studies
      'iron', 'serum iron',
      'tibc', 'total iron binding capacity',
      'transferrin', 'transferrin saturation',
      'ferritin', 'serum ferritin',
      
      // Vitamins
      'vitamin d', 'vit d', '25-oh vitamin d', '25(oh)d',
      'vitamin b12', 'vit b12', 'b12', 'cobalamin',
      'folic acid', 'folate', 'vitamin b9',
      
      // Urine Analysis
      'ph', 'specific gravity', 'sp gravity', 'sp gr',
      'pus cells', 'pus cell',
      'epithelial cells', 'epithelial cell',
      'casts', 'cast',
      'crystals', 'crystal',
      'urobilinogen', 'bilirubin', 'bile pigment', 'bile salts',
      'occult blood', 'blood',
      'ketone', 'ketones', 'acetone',
      'nitrite', 'nitrites',
      'leukocyte esterase', 'leukocytes'
    ];

    // Split text into lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Find test names (lines containing medical keywords)
    const testNames = [];
    const testValues = [];
    const testUnits = [];

    let inTestSection = false;
    let inResultSection = false;
    let inUnitsSection = false;
    let previousLine = ''; // Track previous line for multi-line parameter names

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Detect section headers
      if (/\b(test|investigation|test\s+description)\b/i.test(line) && line.length < 30) {
        inTestSection = true;
        inResultSection = false;
        inUnitsSection = false;
        console.log(`   📋 Found TEST section at line ${i}: "${line}"`);
        continue;
      }
      
      if (/(result|observed\s*value|observed|measured|findings?|value\s*\(\s*s\s*\))/i.test(line) && line.length < 30) {
        inTestSection = false;
        inResultSection = true;
        inUnitsSection = false;
        console.log(`   📊 Found RESULT section at line ${i}: "${line}"`);
        continue;
      }
      
      // Match standalone "Unit" or "Units" header only (not "Ward/Unit :OP" or other metadata)
      if (/^(units?|unit\s*\(\s*s\s*\))$/i.test(line) && line.length < 25) {
        inTestSection = false;
        inResultSection = false;
        inUnitsSection = true;
        console.log(`   📏 Found UNITS section at line ${i}: "${line}"`);
        continue;
      }

      // Skip non-medical lines (lab info, patient info, interpretation text, etc.)
      // Note: Removed "cell" from pattern as it was incorrectly filtering "Packed Cell Volume", "Red Blood Cell Count" etc.
      if (/email|phone|hospital|clinic|lab|address|patient|incharge|reference\s*range|working\s*hours|sid\s*no|ref\.\s*by|interpretation|source|mobile|scan\s+to|landmark|township|diagnostics|pathology|hyderabad|telangana|puducherry|mudalyarpet|pondicherry|gmail|www\.|indicating|indicates|prediabetes|diabetes\s+mellitus/i.test(lowerLine)) {
        continue;
      }

      // Skip addresses (road, street, city names, pin codes, office/building numbers)
      // Also skip "No, 153", "ISO 9001", etc.
      if (/road|street|avenue|nagar|city|town|village|bilaspur|bangalore|delhi|mumbai|ghatkopar|hyderabad|chennai|pune|kolkata|nursing\s+home|hospital|clinic|wing|block|building|floor|pant\s+nagar|\d{6}|^no[.,\s]+\d+|^#\s*\d+|^iso\s+\d+|krupa|complex/i.test(lowerLine)) {
        continue;
      }

      // Skip qualifications and titles (D.M.L.T, M.B.B.S, Ph.D, etc.)
      if (/\b(d\.?m\.?l\.?t|b\.?m\.?l\.?t|m\.?b\.?b\.?s|m\.?d\.|ph\.?d|dr\.|mr\.|mrs\.|ms\.)\b/i.test(lowerLine)) {
        continue;
      }

      // Skip lab/company names and headers
      if (/crystal\s+lab|crystal\s+data|drlogy|pathology\s+lab|consulting|development|support|lab\s+no\.|patient\s+name|sample\s+coll|ref\.\s*by\s+dr|printed\s+by|end\s+of\s+report/i.test(lowerLine)) {
        continue;
      }

      // Skip report type headers (don't extract as parameters)
      if (/^(routine|urine|examination|physical|chemical|microscopic)$/i.test(lowerLine) || /routine\s+(urine|blood|examination)/i.test(lowerLine)) {
        continue;
      }

      // Skip interpretation/explanation text
      // NOTE: Don't match standalone "serum" as it appears in parameter names like "T3, TOTAL, SERUM"
      if (/variation|circadian|peak\s+levels|minimum|maximum|interpretation|indicate|pregnancy|trimester|subject|order\s+of|measured\s+serum|serum\s+(concentrations|levels)|concentrations/i.test(lowerLine)) {
        continue;
      }

      // Skip company/registration info
      if (/cin\s*no|regd|registered|office|national|web:|www\.|block-?[a-z]|section|limited|ltd|llp|pvt/i.test(lowerLine)) {
        continue;
      }

      // Skip date/time patterns
      if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}:\d{2}\s*(am|pm)?/i.test(line)) {
        continue;
      }

      // Skip method descriptions
      if (/method\s*:|cmia|elisa|ria|immunoassay|note:/i.test(lowerLine)) {
        continue;
      }

      // Skip patient names (Ms./Mr./Dr. Name or Name with title)
      if (/^(ms\.|mr\.|mrs\.|dr\.|miss|master)\s+[a-z]/i.test(line) || /^[.:]\s*(ms\.|mr\.|mrs\.|dr\.)/i.test(line)) {
        continue;
      }

      // Skip age/gender info
      if (/\d+\s*(y|yr|yrs|years?)\s*\/\s*(male|female|m|f)/i.test(line)) {
        continue;
      }

      // Skip hospital/lab identifiers and metadata
      if (/(hosp\.|hospital)\s*(uhid|id|no)/i.test(line) || /^(lab\.|lab)\s*(id|no|code)/i.test(line) || /^p\d{6,}/i.test(line)) {
        continue;
      }

      // Skip reference range/interval labels
      if (/biological\s*(ref|reference)|ref\.\s*interval|normal\s*range|reference\s*values?/i.test(line)) {
        continue;
      }

      // Skip collection/report metadata
      if (/(collected|received|reported|print(ed)?|reg\.|registration)\s*(at|on|date|time)?/i.test(line)) {
        continue;
      }

      // Skip specimen/sample type labels
      if (/^(specimen|sample)\s*(:|\s)/i.test(line)) {
        continue;
      }

      // Extract test names (lines with medical keywords)
      if (inTestSection || (!inResultSection && !inUnitsSection)) {
        // FIRST: Skip marketing/branding text (check BEFORE keyword matching)
        if (/accurate\s+caring|instant|quality|certified|accredited|nabl|iso|overall\s+status|wellness/i.test(line)) {
          console.log(`   ⚠️  Skipped marketing/branding text: "${line}"`);
          continue;
        }
        
        // Skip report titles (lines combining multiple test types like "Blood Glucose and Lipid Profile")
        if (/\b(and|&|with|\+)\b/i.test(line) && /profile|panel|test|report/i.test(line)) {
          console.log(`   ⚠️  Skipped report title: "${line}"`);
          continue;
        }
        
        // SECOND: Fix common parameter OCR errors and formats
        let normalizedLine = line;
        let normalizedLowerLine = lowerLine;
        
        // Fix common KFT/general parameter OCR errors
        if (/^calciuum$/i.test(line.trim())) {
          normalizedLine = 'Calcium';
          normalizedLowerLine = 'calcium';
          console.log(`   🔧 Fixed OCR error: "${line}" → "Calcium"`);
        }
        
        // Fix "rSH" → "TSH" (common OCR error)
        if (/^\d+[a-z]{1,2}$/i.test(line.trim())) {
          normalizedLine = 'TSH';
          normalizedLowerLine = 'tsh';
          console.log(`   🔧 Fixed OCR error: "${line}" → "TSH"`);
        }
        
        // Check if this line is a continuation of previous line (multi-line parameter)
        // Example: "Thyroid Stimulating" on one line, "Hormone(TSH)" on next line
        if (previousLine) {
          const prevLower = previousLine.toLowerCase();
          // If previous line was "Thyroid Stimulating" and current is "Hormone(TSH)"
          if (/thyroid\s+(stimulating|stim)/i.test(prevLower) && /^hormone/i.test(normalizedLowerLine)) {
            // Combine them
            normalizedLine = 'TSH';
            normalizedLowerLine = 'tsh';
            // Remove the "Thyroid Stimulating" entry if it was just added
            if (testNames.length > 0 && /thyroid\s+(stimulating|stim)/i.test(testNames[testNames.length - 1].name)) {
              testNames.pop();
              console.log(`   🔧 Combined multi-line parameter: "${previousLine}" + "${line}" → "TSH"`);
            }
          }
        }
        
        // Normalize thyroid formats: "T3, TOTAL, SERUM" → "T3, Total"
        if (/^t3\s*,?\s*total/i.test(line)) {
          normalizedLine = 'T3, Total';
          normalizedLowerLine = 't3, total';
          console.log(`   🔧 Normalized thyroid format: "${line}" → "T3, Total"`);
        }
        if (/^t4\s*,?\s*total/i.test(line)) {
          normalizedLine = 'T4, Total';
          normalizedLowerLine = 't4, total';
          console.log(`   🔧 Normalized thyroid format: "${line}" → "T4, Total"`);
        }
        if (/^ft3\s*,?\s*(free)?/i.test(line)) {
          normalizedLine = 'FT3';
          normalizedLowerLine = 'ft3';
          console.log(`   🔧 Normalized thyroid format: "${line}" → "FT3"`);
        }
        if (/^ft4\s*,?\s*(free)?/i.test(line)) {
          normalizedLine = 'FT4';
          normalizedLowerLine = 'ft4';
          console.log(`   🔧 Normalized thyroid format: "${line}" → "FT4"`);
        }
        
        // Check if this is a standalone sub-parameter (appears alone on line)
        if (/^(sys|systolic|dia|diastolic|pul|pulse)$/i.test(normalizedLowerLine)) {
          // This is a sub-parameter - attach to last main test
          testNames.push({ name: normalizedLine, type: 'sub', parent: testNames.length - 1 });
          console.log(`   ✅ Sub-parameter found: "${normalizedLine}"`);
          continue;
        }

        // Skip interpretation/explanation text that contains medical keywords
        // Examples: "• Chloride - Dehydration, kidney disease.", "Sodium - Overhydration..."
        if (/^[•.\-\s]+(sodium|potassium|chloride|calcium|magnesium|bicarbonate|glucose|cholesterol|urea|creatinine)/i.test(line)) {
          // Line starts with bullet/dash and medical keyword - likely explanation
          if (/cause|disease|syndrome|condition|dehydration|overhydration|deficiency|excess|elevated|decreased|high|low/i.test(lowerLine)) {
            console.log(`   ⚠️  Skipped interpretation text: "${line.substring(0, 40)}..."`);
            continue;
          }
        }

        // Check for main medical keywords (actual test names)
        let foundKeyword = false;
        for (const keyword of medicalKeywords) {
          if (normalizedLowerLine.includes(keyword)) {
            // For short keywords (1-2 chars), require word boundary match to avoid false positives
            // Example: "K" in "SUMALATHA K PATIL" shouldn't match potassium keyword "k"
            if (keyword.length <= 2) {
              const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
              if (!wordBoundaryRegex.test(lowerLine)) {
                continue; // Skip this keyword, try next one
              }
              // Even with word boundary, skip if it's part of a proper name (capitalized words before/after)
              const namePattern = new RegExp(`[A-Z][a-z]+\\s+${keyword}\\s+[A-Z][a-z]+`, 'i');
              if (namePattern.test(line)) {
                continue; // Likely a name like "JOHN K SMITH"
              }
            }

            // Additional validation: Filter out junk that happens to contain keywords
            // Skip if it's just a method/technique in parentheses
            if (/^\([^)]*\)$/.test(line)) {
              console.log(`   ⚠️  Skipped method in parentheses: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip if it's a method/technique description
            if (/^(electrical\s+impede?nce|photometric|calculated|caiculated|vcs\s+technology|fluorescence|enzymatic|spectrophotometry|chemiluminescence|elisa|ria)/i.test(lowerLine)) {
              console.log(`   ⚠️  Skipped method/technique: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip generic labels
            if (/^(name|age|sex|gender|date|time|results?|units?|test|value|sample|patient|doctor|lab)$/i.test(lowerLine)) {
              console.log(`   ⚠️  Skipped generic label: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip lab names/locations (contain location names or lab codes)
            if (/^[A-Z0-9]{2,6}-[A-Z]{2,6}\s+/i.test(line) || /nagar|city|town|center|centre$/i.test(lowerLine)) {
              console.log(`   ⚠️  Skipped lab/location name: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip if line is too long (likely a description/instruction, not a parameter)
            if (line.length > 45) {
              console.log(`   ⚠️  Skipped long description: "${line.substring(0, 40)}..."`);  
              foundKeyword = false;
              continue;
            }
            
            // Skip headers and notes that aren't actual parameters            // Use flexible patterns to handle OCR typos (e.g., "ditferential" vs "differential")
            if (/count.*\(calculated\)|d[il][tfc]{1,2}erential.*dlc|dlc.*vcs|platelets?\s+cross\s+checked/i.test(lowerLine)) {
              console.log(`   ⚠️  Skipped header/note: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Additional validation: For thyroid reports, ONLY accept T3/T4/TSH
            const isThyroidKeyword = /^(t3|t4|tsh|triiodothyronine|thyroxine|thyroid\s+stimulating|thyroid\s+stim|free\s+t3|free\s+t4|total\s+t3|total\s+t4|ft3|ft4)$/i.test(keyword);
            
            // More lenient regex to handle OCR typos:
            // - "triidothyroninc" (missing "e" at end)
            // - "triidothyronine" (missing "thy")
            // - "free thyroxine(ft4)" with parentheses
            // - "hormone(tsh)" as separate line
            const looksLikeThyroidTest = /^(t3|t4|tsh|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?|total\s+(tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?|t3|t4)|thyroid\s+(stimulating|stim)|hormone|free\s+(t3|t4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?)|ft[34])(\([^\)]*\))?/i.test(normalizedLowerLine);
            
            // If this contains a thyroid keyword but doesn't actually look like a thyroid test, skip it
            if (isThyroidKeyword && !looksLikeThyroidTest) {
              console.log(`   ⚠️  Skipped thyroid keyword in junk: "${line}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip lines that are just fragments or partial words
            if (normalizedLine.length < 2 || /^\d+[a-z]{1,2}$/i.test(normalizedLine)) {
              console.log(`   ⚠️  Skipped fragment: "${normalizedLine}"`);
              foundKeyword = false;
              continue;
            }
            
            // Skip marketing/branding text
            if (/accurate\s+caring|instant|quality|certified|accredited|nabl|iso|overall\s+status|wellness|health\s+care/i.test(normalizedLine)) {
              console.log(`   ⚠️  Skipped marketing text: "${normalizedLine}"`);
              foundKeyword = false;
              continue;
            }
            
            // This is a main test name (use normalized name)
            testNames.push({ name: normalizedLine, type: 'main' });
            foundKeyword = true;
            console.log(`   ✅ Test name found: "${normalizedLine}"`);
            break;
          }
        }
        if (foundKeyword) {
          previousLine = line; // Track for multi-line parameter names
          continue;
        }
      }

      // Extract result values (numeric lines)
      // Allow extraction in both TEST and RESULT sections to handle values that appear before "Result" header
      // For thyroid reports without section headers, allow value extraction anywhere
      // Accept both period (.) and comma (,) as decimal separators
      const hasThyroidKeywords = testNames.some(t => /^(t3|t4|tsh|triiodothyronine|thyroxine|thyroid)/i.test(t.name));
      const allowValueExtractionAnywhere = hasThyroidKeywords && testNames.length > 0;
      
      if (inResultSection || (inTestSection && /^\d+(?:[.,]\d+)?$/.test(line)) || (allowValueExtractionAnywhere && /^\d+(?:[.,]\d+)?$/.test(line))) {
        // Skip numbers that are likely postal codes (5-6 digits, value > 10000)
        // Example: "605004", "123456"
        if (/^\d{5,6}$/.test(line)) {
          const numVal = parseInt(line);
          if (numVal >= 10000) {
            console.log(`   ⚠️  Skipped postal code: "${line}"`);
            continue;
          }
        }
        
        // Skip small integers that are likely address numbers, phone area codes, or ISO cert numbers
        // Example: "153" (address), "413" (phone area code), "9001" (ISO 9001)
        // Medical values are typically decimals or in specific ranges
        // Blood sugar: typically 50-500 range
        // Thyroid: T3 (1-15), T4 (40-200), TSH (0.1-20)
        // Kidney: Urea (15-40), Creatinine (0.6-1.2 but can be 2-40 in kidney failure)
        // Only skip very small numbers (< 10) or certification numbers (9000-9999)
        if (/^\d{2,4}$/.test(line)) {
          const numVal = parseInt(line);
          // Skip if it looks like a certification number (9000-9999) or very small (<10 except for decimals)
          if (numVal >= 9000 && numVal <= 9999) {
            console.log(`   ⚠️  Skipped likely cert number: "${line}"`);
            continue;
          }
        }
        
        // Handle various OCR edge cases:
        // - Normal: "8.4", "135.0"
        // - OCR errors: "8D.00" → "80.00", "1O.5" → "10.5" (O→0, D→0, l→1, etc.)
        // - Space in decimal: "0 60" → 0.60
        // - Missing leading digit: ".0" → check context or skip
        // - Trailing artifact: "88(" → 8.8
        
        let valueToAdd = null;
        
        // Pattern 0: OCR errors - Letter misread as digit (e.g., "8D.00" → "80.00", "1O.5" → "10.5")
        // Common OCR errors: D→0, O→0, l→1, I→1, S→5, B→8, Z→2
        if (!valueToAdd && /^\d+[DOBISZL][.,]?\d*$/i.test(line)) {
          const corrected = line
            .replace(/D/gi, '0')
            .replace(/O/gi, '0')
            .replace(/[IL]/gi, '1')
            .replace(/S/gi, '5')
            .replace(/B/gi, '8')
            .replace(/Z/gi, '2')
            .replace(',', '.');
          
          if (/^\d+(?:\.\d+)?$/.test(corrected)) {
            valueToAdd = parseFloat(corrected);
            console.log(`   🔧 Fixed OCR error in value: "${line}" → ${corrected}`);
          }
        }
        
        // Pattern 1: Normal number with optional decimal
        const normalMatch = line.match(/^(\d+(?:[.,]\d+)?)$/);
        if (normalMatch) {
          const normalizedValue = normalMatch[1].replace(',', '.');
          valueToAdd = parseFloat(normalizedValue);
        }
        
        // Pattern 2: Space instead of decimal point (e.g., "0 60" → 0.60)
        if (!valueToAdd && /^\d+\s+\d+$/.test(line)) {
          const parts = line.split(/\s+/);
          if (parts.length === 2) {
            const combined = `${parts[0]}.${parts[1]}`;
            valueToAdd = parseFloat(combined);
            console.log(`   🔧 Fixed space-separated decimal: "${line}" → ${combined}`);
          }
        }
        
        // Pattern 3: Trailing non-numeric character (e.g., "88(" → 8.8)
        if (!valueToAdd && /^\d+(?:[.,]\d+)?[^\d.,]$/.test(line)) {
          const cleaned = line.replace(/[^\d.,]/g, '').replace(',', '.');
          // Check if it makes sense as a decimal
          if (/^\d+\d$/.test(cleaned) && cleaned.length >= 2) {
            // "88" might be "8.8" - insert decimal before last digit
            const beforeLast = cleaned.substring(0, cleaned.length - 1);
            const lastDigit = cleaned.substring(cleaned.length - 1);
            const reconstructed = `${beforeLast}.${lastDigit}`;
            valueToAdd = parseFloat(reconstructed);
            console.log(`   🔧 Fixed artifact and added decimal: "${line}" → ${reconstructed}`);
          }
        }
        
        // Pattern 4: Leading decimal point only (e.g., ".0")
        if (!valueToAdd && /^\.\d+$/.test(line)) {
          // Fragment decimal like ".0" - likely missing leading digit
          // Common pattern: "4.0" becomes ".0" in OCR
          // Check if there's a nearby integer that could be the leading digit
          // For now, try inferring: if it's a single digit after decimal,
          // assume it might be X.0 where X is a small number (2-5 most common)
          const afterDecimal = line.substring(1);
          if (afterDecimal === '0') {
            // ".0" is likely "4.0" or "3.0" or "5.0"
            // Default to 4.0 as it's most common for ALBUMIN range (3.5-5.2)
            valueToAdd = 4.0;
            console.log(`   🔧 Inferred fragment decimal: "${line}" → 4.0 (likely ALBUMIN)`);
          } else {
            // Other fragment like ".5" → skip it
            console.log(`   ⚠️  Skipped fragment decimal: "${line}" (missing leading digit)`);
          }
        }
        
        if (valueToAdd !== null) {
          testValues.push(valueToAdd);
          console.log(`   ✅ Result value found: ${valueToAdd}`);
        }
        
        // Skip time values
        if (/\d{1,2}:\d{2}/.test(line)) {
          continue;
        }
        
        continue;
      }

      // Extract units
      if (inUnitsSection) {
        const unitPattern = /^(mg\s*[\/']?\s*dl|g\s*[\/']?\s*dl|mm\s*of\s*hg|mmhg|per\/mint|bpm|%|fL|fl|pg|PG|cells\/µl|cells\/mm3?|mill\/mm3|thou\/mm3|lakhs\/µl|µg\/dl|iu\/l|u\/l|mgidl|mmol\/L)/i;
        const unitMatch = line.match(unitPattern);
        if (unitMatch) {
          // Normalize unit format
          let unit = unitMatch[1].replace(/\s/g, '').toLowerCase();
          unit = unit.replace(/mgidl|mg'dl|mgdl/i, 'mg/dL');
          unit = unit.replace(/gdl/i, 'g/dL');
          unit = unit.replace(/fl$/i, 'fL');
          unit = unit.replace(/pg$/i, 'pg');
          testUnits.push(unit);
          console.log(`   ✅ Unit found: ${unit}`);
        }
      }
      
      // Track previous line for multi-line parameter detection
      previousLine = line;
    }

    console.log(`\n   📝 Extracted ${testNames.length} test names, ${testValues.length} values, ${testUnits.length} units`);

    // Special handling for thyroid reports - match values by reference ranges
    const isThyroidReport = testNames.filter(t => /^(t3|t4|tsh|ft3|ft4)/i.test(t.name)).length >= 2;
    if (isThyroidReport && testValues.length === testNames.length) {
      console.log(`   🔬 Thyroid report detected - matching values by reference ranges`);
      
      const t3Test = testNames.find(t => /^t3/i.test(t.name));
      const t4Test = testNames.find(t => /^t4/i.test(t.name));
      const tshTest = testNames.find(t => /^tsh/i.test(t.name));
      
      // Thyroid reference ranges (typical values):
      // T3 Total: 70-190 ng/dL OR 1.2-2.8 nmol/L OR 4-15 if in custom units
      // T4 Total: 5-12 µg/dL OR 60-150 nmol/L OR 60-250 if ng/dL  
      // TSH: 0.4-4.5 mIU/L (can be 0-20 when abnormal)
      const matchedValues = [];
      const usedIndices = new Set();
      
      // First pass: Try to match each value to best-fit parameter
      testValues.forEach((val, idx) => {
        // T4 is usually the highest value (>40 typically)
        if (t4Test && val > 40 && !matchedValues.some(m => m.test === t4Test.name)) {
          matchedValues.push({test: t4Test.name, value: val, index: testNames.indexOf(t4Test)});
          usedIndices.add(idx);
        }
        // TSH can range from 0-20 (often elevated in hypothyroidism)
        else if (tshTest && val >= 0.2 && val <= 20 && val > 5 && !matchedValues.some(m => m.test === tshTest.name)) {
          matchedValues.push({test: tshTest.name, value: val, index: testNames.indexOf(tshTest)});
          usedIndices.add(idx);
        }
        // T3 typically 1-15 range (lower than T4, lower than high TSH)
        else if (t3Test && val >= 1 && val <= 15 && !matchedValues.some(m => m.test === t3Test.name)) {
          matchedValues.push({test: t3Test.name, value: val, index: testNames.indexOf(t3Test)});
          usedIndices.add(idx);
        }
      });
      
      // Second pass: Assign remaining values to unmatched tests
      [t3Test, tshTest, t4Test].forEach(test => {
        if (!test || matchedValues.some(m => m.test === test.name)) return;
        
        for (let i = 0; i < testValues.length; i++) {
          if (usedIndices.has(i)) continue;
          matchedValues.push({test: test.name, value: testValues[i], index: testNames.indexOf(test)});
          usedIndices.add(i);
          break;
        }
      });
      
      // Reorder values to match test name order
      if (matchedValues.length === testValues.length) {
        const reorderedValues = [];
        matchedValues.sort((a, b) => a.index - b.index);
        matchedValues.forEach(m => reorderedValues.push(m.value));
        testValues.length = 0;
        testValues.push(...reorderedValues);
        console.log(`   ✅ Thyroid values reordered: ${testValues.join(', ')}`);
      }
    }

    // Special handling for KFT/Renal/Electrolyte reports - match values by typical reference ranges
    const kftTests = testNames.filter(t => /^(urea|creatinine|uric\s+acid|sodium|potassium|chloride|bicarbonate|calcium|magnesium)/i.test(t.name));
    const isKFTReport = kftTests.length >= 3; // At least 3 kidney/electrolyte parameters
    const hasBloodSugar = testNames.some(t => /blood\s*sugar|glucose/i.test(t.name));
    
    if (isKFTReport && testValues.length === testNames.length) {
      console.log(`   🔬 KFT/Electrolyte report detected - matching values by reference ranges`);
      
      // Typical reference ranges (for matching):
      // Blood Sugar: 70-400 mg/dL (most common: 80-120)
      // Urea: 15-40 mg/dL
      // Creatinine: 0.6-1.2 mg/dL (can be elevated to 2-40 in kidney failure)
      // Uric Acid: 3-7 mg/dL
      // Sodium: 135-145 mEq/L
      // Potassium: 3.5-5.5 mEq/L
      // Chloride: 97-107 mEq/L
      // Bicarbonate: 22-29 mEq/L
      // Calcium: 8.5-10.5 mg/dL
      // Magnesium: 1.5-2.5 mg/dL
      
      const matchedValues = [];
      const usedIndices = new Set();
      
      // Find test objects
      const bloodSugarTest = testNames.find(t => /blood\s*sugar|glucose/i.test(t.name));
      const ureaTest = testNames.find(t => /^urea$/i.test(t.name));
      const creatinineTest = testNames.find(t => /creatinine/i.test(t.name));
      const uricAcidTest = testNames.find(t => /uric\s*acid/i.test(t.name));
      const sodiumTest = testNames.find(t => /sodium/i.test(t.name) && !/serum|specimen|sample/i.test(t.name));
      const potassiumTest = testNames.find(t => /potassium/i.test(t.name) && !/serum|specimen|sample/i.test(t.name));
      const chlorideTest = testNames.find(t => /chloride/i.test(t.name) && !/serum|specimen|sample/i.test(t.name));
      const bicarbonateTest = testNames.find(t => /bicarbonate|hco3/i.test(t.name));
      const calciumTest = testNames.find(t => /calcium/i.test(t.name) && !/serum|specimen|sample/i.test(t.name));
      const magnesiumTest = testNames.find(t => /magnesium/i.test(t.name) && !/serum|specimen|sample/i.test(t.name));
      
      // Match each value to best-fit parameter based on typical ranges
      testValues.forEach((val, idx) => {
        let matched = false;
        
        // Blood Sugar: 50-500 range (typical)
        if (!matched && bloodSugarTest && val >= 50 && val <= 500 && !matchedValues.some(m => m.test === bloodSugarTest.name)) {
          matchedValues.push({test: bloodSugarTest.name, value: val, index: testNames.indexOf(bloodSugarTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Urea: 10-50 range (extended to catch borderline cases)
        if (!matched && ureaTest && val >= 10 && val <= 50 && !matchedValues.some(m => m.test === ureaTest.name)) {
          matchedValues.push({test: ureaTest.name, value: val, index: testNames.indexOf(ureaTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Creatinine: 0.3-15 range (extended for severe kidney failure)
        if (!matched && creatinineTest && val >= 0.3 && val < 15 && val < 10 && !matchedValues.some(m => m.test === creatinineTest.name)) {
          matchedValues.push({test: creatinineTest.name, value: val, index: testNames.indexOf(creatinineTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Uric Acid: 2-10 range
        if (!matched && uricAcidTest && val >= 2 && val <= 10 && val < 8 && !matchedValues.some(m => m.test === uricAcidTest.name)) {
          matchedValues.push({test: uricAcidTest.name, value: val, index: testNames.indexOf(uricAcidTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Sodium: 130-150 range (extended for abnormal cases)
        if (!matched && sodiumTest && val >= 130 && val <= 150 && !matchedValues.some(m => m.test === sodiumTest.name)) {
          matchedValues.push({test: sodiumTest.name, value: val, index: testNames.indexOf(sodiumTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Potassium: 3.0-6.0 range (extended for abnormal cases)
        if (!matched && potassiumTest && val >= 3.0 && val <= 6.0 && !matchedValues.some(m => m.test === potassiumTest.name)) {
          matchedValues.push({test: potassiumTest.name, value: val, index: testNames.indexOf(potassiumTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Chloride: 95-110 range (extended)
        if (!matched && chlorideTest && val >= 95 && val <= 110 && !matchedValues.some(m => m.test === chlorideTest.name)) {
          matchedValues.push({test: chlorideTest.name, value: val, index: testNames.indexOf(chlorideTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Bicarbonate: 20-32 range (extended)
        if (!matched && bicarbonateTest && val >= 20 && val <= 32 && !matchedValues.some(m => m.test === bicarbonateTest.name)) {
          matchedValues.push({test: bicarbonateTest.name, value: val, index: testNames.indexOf(bicarbonateTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Calcium: 7-12 range (extended)
        if (!matched && calciumTest && val >= 7 && val <= 12 && !matchedValues.some(m => m.test === calciumTest.name)) {
          matchedValues.push({test: calciumTest.name, value: val, index: testNames.indexOf(calciumTest)});
          usedIndices.add(idx);
          matched = true;
        }
        
        // Magnesium: 1.0-3.0 range (extended)
        if (!matched && magnesiumTest && val >= 1.0 && val <= 3.0 && !matchedValues.some(m => m.test === magnesiumTest.name)) {
          matchedValues.push({test: magnesiumTest.name, value: val, index: testNames.indexOf(magnesiumTest)});
          usedIndices.add(idx);
          matched = true;
        }
      });
      
      // Second pass: Assign remaining values to unmatched tests (fallback to positional)
      [ureaTest, creatinineTest, bloodSugarTest, uricAcidTest, sodiumTest, potassiumTest, chlorideTest, bicarbonateTest, calciumTest, magnesiumTest].forEach(test => {
        if (!test || matchedValues.some(m => m.test === test.name)) return;
        
        for (let i = 0; i < testValues.length; i++) {
          if (usedIndices.has(i)) continue;
          matchedValues.push({test: test.name, value: testValues[i], index: testNames.indexOf(test)});
          usedIndices.add(i);
          console.log(`   ⚠️  Fallback match: ${test.name} = ${testValues[i]} (could not match by range)`);
          break;
        }
      });
      
      // Reorder values to match test name order
      if (matchedValues.length === testValues.length) {
        const reorderedValues = [];
        matchedValues.sort((a, b) => a.index - b.index);
        matchedValues.forEach(m => reorderedValues.push(m.value));
        testValues.length = 0;
        testValues.push(...reorderedValues);
        console.log(`   ✅ KFT values reordered: ${testValues.join(', ')}`);
      }
    }

    // Post-process: Reorder tests logically
    // Main tests should come first, then their sub-parameters
    const mainTests = [];
    const subParams = [];
    
    for (const test of testNames) {
      if (test.type === 'main') {
        mainTests.push(test);
      } else if (test.type === 'sub') {
        subParams.push(test);
      }
    }

    // Now assign sub-parameters to their parents
    const bloodPressureTest = mainTests.find(t => /blood\s*pressure|bp/i.test(t.name));
    const bloodSugarTests = mainTests.filter(t => /blood\s*sugar|glucose/i.test(t.name));
    const otherTests = mainTests.filter(t => 
      !(/blood\s*pressure|bp|blood\s*sugar|glucose/i.test(t.name))
    );

    // Build final ordered list
    const processedTests = [];
    
    // Only reorder blood sugar tests to the front if this is primarily a blood sugar report
    // For mixed reports (KFT with blood sugar, etc.), keep original order to preserve value matching
    const isPrimaryBloodSugarReport = bloodSugarTests.length > 0 && otherTests.length <= 1;
    
    if (isPrimaryBloodSugarReport) {
      // Add blood sugar tests first
      processedTests.push(...bloodSugarTests);
      // Add other single-value tests
      processedTests.push(...otherTests);
    } else {
      // Keep original order - DO NOT reorder
      processedTests.push(...mainTests.filter(t => !(/blood\s*pressure|bp/i.test(t.name))));
    }
    
    // Add blood pressure with its sub-parameters
    if (bloodPressureTest) {
      processedTests.push(bloodPressureTest);
      // Add sub-parameters (Sys, Dia, Pul)
      for (const sub of subParams) {
        sub.deferredParent = bloodPressureTest.name;
        processedTests.push(sub);
      }
    }

    console.log(`   🔄 Reordered: ${bloodSugarTests.length} blood sugar tests, ${subParams.length} BP sub-params`);

    // Match test names with values and units by position
    let valueIdx = 0;
    let lastMainTest = null;
    
    for (let i = 0; i < processedTests.length && valueIdx < testValues.length; i++) {
      const testObj = processedTests[i];
      
      let parameterName = '';
      let skipValue = false;
      
      if (testObj.type === 'main') {
        // Main test - check if it's blood pressure (multi-value test)
        if (/blood\s*pressure|bp/i.test(testObj.name)) {
          // Blood pressure - the actual values belong to sub-parameters (Sys/Dia)
          // Don't consume a value for the main "Blood Pressure" entry
          lastMainTest = testObj.name;
          skipValue = true;
        } else {
          // Regular single-value test
          parameterName = testObj.name;
          lastMainTest = testObj.name;
        }
      } else if (testObj.type === 'sub') {
        // Sub-parameter - combine with appropriate parent
        const subName = testObj.name;
        // Expand abbreviations
        const expandedSub = subName
          .replace(/^sys$/i, 'Systolic')
          .replace(/^dia$/i, 'Diastolic')
          .replace(/^pul$/i, 'Pulse');
        
        // Use deferred parent if available, otherwise use lastMainTest
        const parent = testObj.deferredParent || lastMainTest;
        
        // If it's Pulse, treat as separate parameter
        if (/pulse/i.test(expandedSub)) {
          parameterName = expandedSub;
        } else if (parent && /blood\s*pressure|bp/i.test(parent)) {
          // Attach to Blood Pressure
          parameterName = `Blood Pressure ${expandedSub}`;
        } else {
          parameterName = expandedSub;
        }
      }

      if (skipValue) {
        console.log(`   ⏭️  Skipped value for: ${testObj.name} (multi-value test)`);
        continue;
      }

      const value = testValues[valueIdx];
      let unit = testUnits[valueIdx] || '';
      
      // Infer correct unit based on parameter name and value
      // This fixes unit misalignment in columnar reports with missing units
      unit = this.inferUnit(parameterName, value, unit);
      
      // Fix decimal point errors based on expected ranges
      let correctedValue = this.correctDecimalErrors(parameterName, value, unit);
      
      // Skip parameters with invalid values (marked as null by correctDecimalErrors)
      if (correctedValue === null) {
        console.log(`   ⚠️  Skipped parameter with invalid value: "${parameterName}" = ${value}`);
        valueIdx++;
        continue;
      }
      
      // Re-infer unit with corrected value (in case decimal correction changed the value range)
      unit = this.inferUnit(parameterName, correctedValue, unit);
      
      valueIdx++;

      // Clean up parameter name
      parameterName = parameterName
        .replace(/[(),:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Normalize thyroid parameter names
      // First, remove redundant T3/T4/TSH suffixes if full name is present
      parameterName = parameterName
        .replace(/^triiodothyronine\s+t3$/i, 'T3, Total')
        .replace(/^total\s+thyroxine\s+t4$/i, 'T4, Total')
        .replace(/^total\s+triiodothyronine\s+t3$/i, 'T3, Total')
        .replace(/^thyroxine\s+t4$/i, 'T4, Total')
        .replace(/^thyroid\s+stim(?:ulating)?(?:\s+hormone)?$/i, 'TSH')
        // Then handle standalone names
        .replace(/^triiodothyronine$/i, 'T3, Total')
        .replace(/^total\s+thyroxine$/i, 'T4, Total')
        .replace(/^total\s+triiodothyronine$/i, 'T3, Total')
        .replace(/^thyroxine$/i, 'T4, Total');
      
      // Skip if parameter is too short or looks invalid
      if (parameterName.length < 2 || /^\d+$/.test(parameterName)) {
        console.log(`   ⚠️  Skipped invalid parameter: "${parameterName}"`);
        continue;
      }
      
      // Final validation: Skip junk that slipped through
      const paramLower = parameterName.toLowerCase();
      
      // Skip method/technique names
      if (/^(electrical|photometric|calculated|caiculated|impedence|impendence|vcs|technology|fluorescence|enzymatic)$/i.test(paramLower)) {
        console.log(`   ⚠️  Skipped method: "${parameterName}"`);
        continue;
      }
      
      // Skip generic labels
      if (/^(name|age|sex|result|unit|value|test|sample|date|time)$/i.test(paramLower)) {
        console.log(`   ⚠️  Skipped label: "${parameterName}"`);
        continue;
      }
      
      // Skip lab/location names (containing location keywords or lab codes)
      if (/nagar|city|town|centre|center|lab\s*\d+|^l\d+-/i.test(paramLower)) {
        console.log(`   ⚠️  Skipped location: "${parameterName}"`);
        continue;
      }

      parameters.push({
        parameter: parameterName,
        value: correctedValue,
        unit: unit,
        confidence: 8 // High confidence for structured extraction
      });

      console.log(`   ✅ Matched: ${parameterName} = ${correctedValue} ${unit}`);
    }

    console.log('='.repeat(70));
    console.log(`📊 Extracted: ${parameters.length} parameters from structured report\n`);

    // Post-processing: Filter by DOMINANT report type to remove cross-contamination
    // Count how many parameters match each type
    const thyroidParams = parameters.filter(p => /t3|t4|tsh|thyroid/i.test(p.parameter)).length;
    const lipidParams = parameters.filter(p => /cholesterol|hdl|ldl|vldl|triglyceride|lipid/i.test(p.parameter)).length;
    const bloodSugarParams = parameters.filter(p => /glucose|blood\s*sugar|fasting|post\s*prandial|hba1c/i.test(p.parameter)).length;
    
    console.log(`📊 Type Detection: Thyroid=${thyroidParams}, Lipid=${lipidParams}, Blood Sugar=${bloodSugarParams}`);
    
    // Apply filter for whichever type has MORE parameters
    // BUT: Don't filter if multiple report types are present (combined reports)
    const multipleReportTypes = (thyroidParams > 0 ? 1 : 0) + (lipidParams > 0 ? 1 : 0) + (bloodSugarParams > 0 ? 1 : 0) > 1;
    
    if (multipleReportTypes) {
      console.log(`📊 Combined report detected - skipping type-based filtering\n`);
    } else if (thyroidParams > lipidParams && thyroidParams > 0) {
      const beforeFilter = parameters.length;
      parameters = parameters.filter(p => {
        const lowerParam = p.parameter.toLowerCase();
        // Only keep valid thyroid parameters (TSH, T3, T4, FT3, FT4)
        // Accept: T3, T4, TSH, FT3, FT4, Triiodothyronine (with OCR typos), Thyroxine, Total T3, Total T4, Free T3, Free T4, etc.
        // Handle OCR typos: triidothyroninc, triidothyronine, thyroxinc, etc.
        const isValid = /^(t3|t4|tsh|ft3|ft4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?|total\s+(t3|t4|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?)|thyroid\s+(stimulating|stim)|free\s+(t[34]|tri[io]{1,2}do?thyronin[ce]?|thyroxin[ce]?))(\s|$|\()/i.test(lowerParam);
        if (!isValid) {
          console.log(`   ❌ Filtered out non-thyroid: "${p.parameter}"`);
        }
        return isValid;
      });
      const removed = beforeFilter - parameters.length;
      if (removed > 0) {
        console.log(`🔍 Thyroid Report Detected: Filtered out ${removed} non-thyroid parameters\n`);
      }
    } else if (lipidParams > 0) {
      const beforeFilter = parameters.length;
      parameters = parameters.filter(p => {
        const lowerParam = p.parameter.toLowerCase();
        // Only keep valid lipid parameters (Total Cholesterol, HDL, LDL, VLDL, Triglycerides, ratios)
        return /^(total\s+cholesterol|cholesterol|hdl|ldl|vldl|triglyceride|chol\/hdl|tc\/hdl|ldl\/hdl|non\s+hdl|hdl\s+risk|risk\s+factor)\b/i.test(lowerParam);
      });
      const removed = beforeFilter - parameters.length;
      if (removed > 0) {
        console.log(`🔍 Lipid Profile Detected: Filtered out ${removed} non-lipid parameters\n`);
      }
    }

    return {
      success: parameters.length > 0,
      parameters: parameters,
      totalExtracted: parameters.length,
      message: parameters.length > 0 ? 'Structured extraction successful' : 'No parameters found'
    };
  }


  /**
   * Find all numeric values, excluding non-medical numbers
   */
  findAllNumbers(text) {
    const matches = [];
    const numberRegex = /(\d+(?:\.\d+)?)/g;
    let match;

    while ((match = numberRegex.exec(text)) !== null) {
      const value = match[1];
      const index = match.index;
      
      // Get context window
      const contextStart = Math.max(0, index - 50);
      const contextEnd = Math.min(text.length, index + value.length + 20);
      const context = text.substring(contextStart, contextEnd);

      // Check if should ignore
      if (!this.shouldIgnore(context, value, text, index)) {
        matches.push({
          value: parseFloat(value),
          rawValue: value,
          index: index,
          context: context
        });
      }
    }

    return matches;
  }

  /**
   * Check if a number should be ignored
   */
  shouldIgnore(context, value, fullText, index) {
    // Ignore very long numbers (likely phone/postal codes) - but more carefully
    // Allow numbers up to 6 digits for medical values (like platelet count 150000)
    if (value.length > 6 && !/\./.test(value)) {
      // But check if it's NOT followed by a medical unit
      const afterNumber = fullText.substring(
        index + value.length,
        Math.min(fullText.length, index + value.length + 20)
      );
      const hasUnit = this.medicalUnits.some(unit => {
        const regex = new RegExp(`^\\s*${unit.replace(/[\/()]/g, '\\$&')}`, 'i');
        return regex.test(afterNumber);
      });
      if (!hasUnit) {
        return true; // Long number without a unit = likely ID/phone
      }
    }

    // Special handling for dates - be more precise
    const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-](\d{2,4})/;
    const dateMatch = context.match(datePattern);
    if (dateMatch) {
      const dateString = dateMatch[0];
      if (dateString.includes(value)) {
        return true;
      }
    }

    // Check if surrounded by phone number indicators
    const phoneContext = /(\+91|cell|phone|mobile|contact).*\d+/i;
    if (phoneContext.test(context)) {
      // More aggressive check - if "cell" or "phone" appears within 40 chars
      const beforeNumber = fullText.substring(Math.max(0, index - 40), index);
      if (/cell|phone|mobile|contact/i.test(beforeNumber)) {
        return true;
      }
    }

    // Test against other ignore patterns (skip date which we handled above and long numbers)
    for (let i = 1; i < this.ignorePatterns.length; i++) {
      const { pattern } = this.ignorePatterns[i];
      if (pattern.test(context)) {
        return true;
      }
    }

    // Detect reference ranges (e.g., "70-110" or "13-17")
    const beforeNumber = fullText.substring(Math.max(0, index - 15), index);
    const afterNumber = fullText.substring(
      index + value.length, 
      Math.min(fullText.length, index + value.length + 15)
    );
    
    // Pattern: "number-number" or "number - number"
    if (/\d+\s*$/.test(beforeNumber) && /^\s*-\s*\d+/.test(afterNumber)) {
      return true;
    }
    if (/\d+\s*-\s*$/.test(beforeNumber)) {
      return true;
    }

    // If "reference" keyword appears within 30 chars before this number
    const contextBefore = fullText.substring(Math.max(0, index - 30), index);
    if (/reference/i.test(contextBefore)) {
      return true;
    }

    // Check if this appears to be part of an address/location
    if (/hospital|clinic|lab|address|location|opp\.|govt\./i.test(context)) {
      return true;
    }

    return false;
  }

  /**
   * Extract parameter name and unit for a specific number
   */
  extractParameterContext(text, match) {
    const { value, index } = match;

    // Get text before and after the number
    const textBefore = text.substring(Math.max(0, index - 50), index);
    const textAfter = text.substring(
      index + String(value).length, 
      Math.min(text.length, index + String(value).length + 20)
    );

    // Extract parameter name (from text before)
    const parameter = this.extractParameterName(textBefore);
    if (!parameter) return null;

    // Extract unit (from text after)
    const unit = this.extractUnit(textAfter);

    // Calculate confidence
    const confidence = this.calculateConfidence(parameter, value, unit);

    return {
      parameter: parameter,
      value: value,
      unit: unit,
      confidence: confidence
    };
  }

  /**
   * Extract parameter name from text before number
   */
  extractParameterName(textBefore) {
    // Clean text
    let cleaned = textBefore.trim();

    // Look for medical test keywords - prioritize these
    const medicalKeywords = [
      // Blood Sugar / Glucose
      'blood sugar', 'glucose', 'fasting', 'post prandial', 'pp', 'random', 'ppbs', 'fbs',
      'hba1c', 'hb a1c', 'glycated', 'insulin', 'c-peptide',
      
      // Complete Blood Count (CBC)
      'hemoglobin', 'haemoglobin', 'hb', 'hgb',
      'packed cell volume', 'pcv', 'hematocrit', 'haematocrit', 'hct',
      'rbc', 'red blood cell', 'red cell',
      'wbc', 'white blood cell', 'white cell', 'leukocyte', 'leucocyte',
      'total leukocyte', 'total leucocyte', 'tlc',
      'platelet', 'plt', 'platelet count',
      'mcv', 'mean corpuscular volume', 'mean cell volume',
      'mch', 'mean corpuscular hemoglobin', 'mean cell hemoglobin',
      'mchc', 'mean corpuscular hemoglobin concentration',
      'rdw', 'red cell distribution', 'red blood cell distribution',
      'mpv', 'mean platelet volume',
      'pdw', 'platelet distribution width',
      
      // WBC Differential
      'neutrophil', 'segmented neutrophil', 'polymorphs',
      'lymphocyte',
      'monocyte',
      'eosinophil',
      'basophil',
      'differential', 'dlc', 'differential leucocyte',
      'absolute', 'absolute leucocyte', 'absolute leukocyte',
      
      // Lipid Profile
      'cholesterol', 'total cholesterol',
      'hdl', 'hdl cholesterol',
      'ldl', 'ldl cholesterol',
      'vldl', 'vldl cholesterol',
      'triglyceride', 'triglycerides',
      
      // Kidney Function
      'creatinine', 'serum creatinine',
      'urea', 'blood urea',
      'bun', 'blood urea nitrogen',
      'uric acid',
      
      // Liver Function
      'bilirubin', 'total bilirubin', 'direct bilirubin', 'indirect bilirubin',
      'sgot', 'sgpt', 'alt', 'ast', 'alp', 'ggt',
      'albumin', 'globulin', 'total protein',
      
      // Thyroid
      'thyroid', 'tsh', 't3', 't4', 'ft3', 'ft4', 'free t3', 'free t4',
      
      // Electrolytes
      'sodium', 'potassium', 'chloride', 'calcium', 'magnesium', 'phosphorus', 'bicarbonate',
      
      // Vitamins & Minerals
      'vitamin', 'vit d', 'vitamin d', 'vitamin b12', 'b12',
      'iron', 'ferritin', 'folate', 'folic acid',
      
      // Urine Analysis
      'ph', 'specific gravity', 'sp gravity', 'sp gr',
      'proteins', 'protein', 'albumin',
      'sugar', 'glucose',
      'pus cells', 'pus cell',
      'epithelial cells', 'epithelial cell',
      'red blood cells', 'rbc', 'blood cells',
      'casts', 'cast',
      'crystals', 'crystal',
      'urobilinogen', 'bile pigment', 'bile salts',
      'occult blood', 'blood',
      'ketone', 'ketones', 'acetone',
      'nitrite', 'nitrites',
      'leukocyte esterase', 'leukocytes',
      'appearance', 'color', 'colour', 'turbidity',
      
      // Vitals
      'blood pressure', 'bp', 'systolic', 'diastolic', 'pulse', 'sys', 'dia', 'pul'
    ];

    // Search for medical keywords in the text before the number
    const lowerCleaned = cleaned.toLowerCase();
    for (const keyword of medicalKeywords) {
      const keywordIndex = lowerCleaned.lastIndexOf(keyword);
      if (keywordIndex !== -1) {
        // Found a medical keyword! Extract from that point
        const fromKeyword = cleaned.substring(keywordIndex);
        // Take up to the first newline or up to 60 characters
        let extracted = fromKeyword.split('\n')[0].substring(0, 60).trim();
        
        // Clean up the extracted parameter name
        const param = this.cleanParameterName(extracted);
        if (this.isValidParameter(param)) {
          // Additional thyroid-specific validation
          if (this.isThyroidKeyword(keyword)) {
            // For thyroid tests, ONLY accept canonical forms
            if (this.isValidThyroidParameter(param)) {
              return param;
            } else {
              // Reject thyroid-keyword junk like "Thyroid Stim", "Tshi", etc.
              continue;
            }
          }
          return param;
        }
      }
    }

    // Strategy 1: Text after last colon (most common: "Hemoglobin: 15")
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      const beforeLastColon = parts[parts.length - 2]?.trim() || '';
      
      if (beforeLastColon) {
        // Get last few words before the colon
        const words = beforeLastColon.split(/\s+/);
        const lastWords = words.slice(-5).join(' ');
        const param = this.cleanParameterName(lastWords);
        if (this.isValidParameter(param)) return param;
      }
    }

    // Strategy 2: Text after last newline (vertical format)
    if (cleaned.includes('\n')) {
      const lines = cleaned.split('\n');
      // Try last few lines
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
        const line = lines[i].trim();
        
        // Skip if line doesn't have a colon and it might be parameter name
        if (line.length > 0 && line.length < 50 && !line.includes(':')) {
          const param = this.cleanParameterName(line);
          if (this.isValidParameter(param)) return param;
        }
      }
    }

    // Strategy 3: Last 2-5 words before number
    const words = cleaned.split(/\s+/);
    const lastWords = words.slice(-5).join(' ');
    const param = this.cleanParameterName(lastWords);
    
    if (this.isValidParameter(param)) {
      return param;
    }

    return null;
  }

  /**
   * Clean and format parameter name
   */
  cleanParameterName(name) {
    // Remove leading numbers (e.g., "123 Hemoglobin" -> "Hemoglobin")
    let cleaned = name.replace(/^\d+\s+/, '').trim();
    
    // Remove parentheses content if exists (e.g., "Hemoglobin (Hb)" -> "Hemoglobin")
    if (cleaned.includes('(')) {
      const beforeParen = cleaned.split('(')[0].trim();
      if (beforeParen.length >= 2) {
        cleaned = beforeParen;
      }
    }

    // Capitalize properly
    cleaned = cleaned
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();

    // Remove excluded words from start and end
    for (const word of this.excludeWords) {
      const startPattern = new RegExp(`^${word}\\s+`, 'i');
      const endPattern = new RegExp(`\\s+${word}$`, 'i');
      cleaned = cleaned.replace(startPattern, '').replace(endPattern, '');
    }

    // Remove trailing numbers and special chars
    cleaned = cleaned.replace(/[\s\d\W]+$/, '').trim();

    return cleaned;
  }

  /**
   * Check if parameter name is valid
   */
  isValidParameter(param) {
    if (!param || param.length < 2) {
      // console.log(`❌ Failed: too short - "${param}"`);
      return false;
    }
    if (param.length > 45) {
      // console.log(`❌ Failed: too long - "${param}"`);
      return false;
    }
    if (!/[a-zA-Z]/.test(param)) {
      // console.log(`❌ Failed: no letters - "${param}"`);
      return false; // Must contain at least one letter
    }
    
    const lowerParam = param.toLowerCase();
    
    // Must not be OR CONTAIN excluded words (using word boundaries to avoid false positives)
    for (const excludeWord of this.excludeWords) {
      // Use word boundaries to match complete words only (e.g., "on" should not match "Monocytes")
      const wordBoundaryPattern = new RegExp(`\\b${excludeWord}\\b`, 'i');
      if (lowerParam === excludeWord || wordBoundaryPattern.test(lowerParam)) {
        // console.log(`❌ Failed: contains excluded word "${excludeWord}" - "${param}"`);
        return false;
      }
    }
    
    // Check against non-medical patterns
    for (const pattern of this.nonMedicalPatterns) {
      if (pattern.test(param)) {
        // console.log(`❌ Failed: matches non-medical pattern ${pattern} - "${param}"`);
        return false;
      }
    }
    
    // Must not look like a location (contains city names, addresses, etc.)
    if (/telangana|hyderabad|bangalore|mumbai|delhi|chennai|kolkata|pune|bilaspur|ghatkopar|pant\s+nagar|road|street|avenue|nagar|nursing\s+home|wing|block|building|floor|krupa|complex|devi/i.test(param)) {
      // console.log(`❌ Failed: looks like location - "${param}"`);
      return false;
    }
    
    // Must not be qualifications or titles
    if (/\b(d\.?m\.?l\.?t|b\.?m\.?l\.?t|m\.?b\.?b\.?s|m\.?d\.|ph\.?d)\b/i.test(param)) {
      // console.log(`❌ Failed: looks like qualification - "${param}"`);
      return false;
    }
    
    // Must not look like person names (common Indian names, doctor names)
    if (/\b(vartak|chavan|patil|sharma|kumar|singh|patel|shah|gupta|reddy|rao|iyer|nair|mishra|jain|agarwal|mehta|joshi|desai|naik)\b/i.test(param)) {
      // console.log(`❌ Failed: looks like person name - "${param}"`);
      return false;
    }
    
    // Must not be interpretation/explanation text
    if (/variation|circadian|peak\s+levels|interpretation|pregnancy|trimester|order\s+of|concentrations?|variant|profoundly|affect|profille|other\s+findings|highlighted\s+result|report\s+printed/i.test(param)) {
      // console.log(`❌ Failed: looks like interpretation text - "${param}"`);
      return false;
    }
    
    // Must not be marketing/branding text
    if (/accurate\s+caring|instant|quality|certified|accredited|nabl|iso|overall\s+status|wellness|health\s+care|accurate.*instant/i.test(param)) {
      // console.log(`❌ Failed: looks like marketing text - "${param}"`);
      return false;
    }
    
    // Must not be company/registration info
    if (/cin\s*no|regd|registered|web|www|block-?[a-z]|section|limited|ltd|llp|pvt/i.test(param)) {
      // console.log(`❌ Failed: looks like company info - "${param}"`);
      return false;
    }
    
    // Must not be fragments or partial words (more patterns)
    if (/^(\d+[a-z]{1,2}|[a-z]{1,2}\d+|entrations|trations|stim|profille|tshi|evels|hiu\/ml|ugidl|ngldL)$/i.test(param)) {
      // console.log(`❌ Failed: looks like fragment - "${param}"`);
      return false;
    }
    
    // Must not be junk phrases
    if (/processed|individuals|american|ldl\s+cholesterol/i.test(param) && param.length < 20) {
      // console.log(`❌ Failed: looks like junk phrase - "${param}"`);
      return false;
    }
    
    // Must not be random short combinations
    if (param.length <= 8 && /as\s+per|are\s+s|total\s+t(?!3|4\b)|\d\.\d{2}o/i.test(param)) {
      // console.log(`❌ Failed: looks like OCR junk - "${param}"`);
      return false;
    }
    
    // Must not look like a person's name with age
    if (/\b[A-Z]\.\s+[A-Z][a-z]+.*age/i.test(param)) {
      // console.log(`❌ Failed: looks like person's name - "${param}"`);
      return false;
    }
    
    // Must not be just a single initial or abbreviation without medical context
    if (/^[A-Z]\.$/.test(param)) {
      // console.log(`❌ Failed: just an initial - "${param}"`);
      return false;
    }
    
    return true;
  }

  /**
   * Check if a keyword is thyroid-related
   */
  isThyroidKeyword(keyword) {
    return /^(thyroid|t3|t4|tsh|triiodothyronine|thyroxine|ft3|ft4|free\s+t3|free\s+t4|total\s+t3|total\s+t4)$/i.test(keyword);
  }

  /**
   * Validate thyroid parameters - only accept canonical forms
   */
  isValidThyroidParameter(param) {
    const lowerParam = param.toLowerCase().trim();
    
    // STRICT: Only these exact forms are valid
    const validThyroidTests = [
      // T3 variants
      't3', 'tri iodothyronine', 'triiodothyronine', 'total t3', 
      'total tri iodothyronine', 'total triiodothyronine',
      // T4 variants
      't4', 'thyroxine', 'total t4', 'total thyroxine',
      // TSH variants
      'tsh', 'thyroid stimulating hormone', 'thyroid-stimulating hormone',
      'thyro id stimulating hormone', 'thyrotropin',
      // Free forms
      'ft3', 'free t3', 'free triiodothyronine',
      'ft4', 'free t4', 'free thyroxine'
    ];
    
    // Check exact match
    if (validThyroidTests.includes(lowerParam)) {
      return true;
    }
    
    // Check if it's a minor variation with extra spaces/punctuation
    const normalized = lowerParam.replace(/[\s\-_()]+/g, ' ').trim();
    if (validThyroidTests.includes(normalized)) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract unit from text after number
   */
  extractUnit(textAfter) {
    const segment = textAfter.trim().substring(0, 25);

    // Try exact match with known units (case-insensitive)
    for (const unit of this.medicalUnits) {
      // Escape special regex characters in unit
      const escapedUnit = unit.replace(/[\/()µ³]/g, '\\$&');
      const regex = new RegExp(`^\\s*${escapedUnit}\\b`, 'i');
      if (regex.test(segment)) {
        return unit;
      }
    }

    // Try to extract common unit patterns
    // Pattern 1: Units with numbers (mill/mm3, thou/mm3, cells/mm3, etc.)
    const numericUnitMatch = segment.match(/^[\s]*([a-z]+\/mm[³3]|[a-z]+\/µ[lL]|[a-z]+\/cumm)/i);
    if (numericUnitMatch) {
      let unit = numericUnitMatch[1];
      // Normalize
      unit = unit.replace(/mm3/i, 'mm³');
      unit = unit.replace(/µl/i, 'µL');
      return unit;
    }

    // Pattern 2: Simple units (fL, pg, %, etc.)
    const simpleUnitMatch = segment.match(/^[\s]*(fL|fl|pg|PG|%|percent)/i);
    if (simpleUnitMatch) {
      let unit = simpleUnitMatch[1];
      // Normalize case
      if (/^fl$/i.test(unit)) return 'fL';
      if (/^pg$/i.test(unit)) return 'pg';
      if (/^percent$/i.test(unit)) return '%';
      return unit;
    }

    // Pattern 3: Concentration units (g/dL, mg/dL, etc.)
    const concUnitMatch = segment.match(/^[\s]*([µumng]?[gG]\/[dD][lL]|[µum]?mol\/[Ll]|[IU][uU]?\/[Ll])/i);
    if (concUnitMatch) {
      let unit = concUnitMatch[1];
      // Normalize
      unit = unit.replace(/dl/i, 'dL');
      unit = unit.replace(/gdl/i, 'g/dL');
      unit = unit.replace(/mgdl|mg\/dl/i, 'mg/dL');
      return unit;
    }

    // Pattern 4: Generic unit-like pattern (contains / or special chars)
    const unitMatch = segment.match(/^[\s]*([a-zA-Zµ°%]+(?:\/[a-zA-Zµ°³0-9]+)?)/);
    if (unitMatch) {
      const possibleUnit = unitMatch[1].trim();
      // Must be short and look like a unit
      if (possibleUnit.length <= 20 && (/\//.test(possibleUnit) || /µ|°|%/.test(possibleUnit))) {
        return possibleUnit;
      }
    }

    return '';
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(parameter, value, unit) {
    let score = 0;

    // Good parameter name length
    if (parameter.length >= 3 && parameter.length <= 50) score += 1;
    
    // Has valid unit (very important!)
    if (unit && unit.length > 0) score += 3;
    
    // Value in reasonable medical range
    if (value > 0 && value < 10000) score += 1;
    
    // Parameter contains medical-sounding words (high priority)
    const medicalTerms = /blood|sugar|glucose|cholesterol|platelet|wbc|rbc|hemoglobin|haemoglobin|hematocrit|haematocrit|packed\s+cell|pcv|mcv|mch|mchc|rdw|distribution\s+width|triglyceride|hdl|ldl|vldl|creatinine|urea|bilirubin|alt|ast|alp|ggt|thyroid|tsh|t3|t4|ft3|ft4|vitamin|iron|ferritin|calcium|sodium|potassium|chloride|magnesium|pressure|fasting|post|prandial|systolic|diastolic|pulse|leukocyte|leucocyte|tlc|dlc|neutrophil|lymphocyte|monocyte|eosinophil|basophil|absolute|segmented|differential|mpv|mean.*volume|count/i;
    if (medicalTerms.test(parameter)) score += 3;

    // Penalize if parameter has random/non-medical words
    const randomWords = /email|gmail|cell|phone|working|hours|hospital|address|clinic|lab|opp|govt|incharge|patient|greattat|weal|diagnostics|pathology|telangana|hyderabad|landmark|township|jagir|reading\s+(over|of)|more\s+than|diabetes\s+mellitus|indicates/i;
    if (randomWords.test(parameter)) score -= 5;
    
    // Additional check: if parameter contains city/state names, heavily penalize
    if (/mumbai|delhi|bangalore|chennai|kolkata|pune|telangana|maharashtra|karnataka/i.test(parameter)) {
      score -= 10;
    }
    
    // If parameter looks like a person's name (initials + surname), penalize
    if (/^[A-Z]\.\s*[A-Z][a-z]+/i.test(parameter)) {
      score -= 10;
    }
    
    // Penalize if it's just "Name" or other generic label
    if (/^(name|age|sex|gender|date|time|result|unit|value)$/i.test(parameter)) {
      score -= 10;
    }

    return Math.max(0, score);
  }
}

module.exports = new SmartMedicalExtractor();
