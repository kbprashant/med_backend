/**
 * Strict Validation System
 * 
 * Enforces strict rules for numeric and qualitative value extraction
 * to prevent extraction of garbage text like "eiog" instead of numbers
 */

/**
 * STRICT numeric validation using regex
 * Only accepts pure numbers (integer or decimal)
 * 
 * Valid: "123", "123.45", "0.5", "10"
 * Invalid: "eiog", "abc123", "12.34.56", "N/A", ""
 * 
 * @param {any} value - The value to validate
 * @returns {boolean} - True if value is strictly numeric
 */
function isStrictlyNumeric(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  // Convert to string for regex testing
  let strValue = String(value).trim();
  
  // Empty or whitespace-only
  if (strValue === '') {
    return false;
  }
  
  // OCR CORRECTION: Fix common decimal errors
  // "300.DO" → "300.00" (D→0, O→0)
  // "50.0D" → "50.00" (D→0)
  // "250.D0" → "250.00" (D→0)
  // Only apply corrections in decimal part (after the dot)
  strValue = strValue.replace(/\.([0-9DOdoIiLl]+)$/g, (match, decimal) => {
    const corrected = decimal
      .replace(/D/gi, '0')  // D → 0
      .replace(/O/gi, '0')  // O → 0
      .replace(/I/gi, '1')  // I → 1
      .replace(/L/gi, '1'); // l → 1
    return '.' + corrected;
  });
  
  // STRICT regex: Only digits with optional decimal point
  // Pattern: /^\d+(\.\d+)?$/
  // - ^ = start of string
  // - \d+ = one or more digits
  // - (\.\d+)? = optional decimal part (dot followed by one or more digits)
  // - $ = end of string
  const numericPattern = /^\d+(\.\d+)?$/;
  
  return numericPattern.test(strValue);
}

/**
 * Extract numeric value from string (strict mode)
 * Returns null if value is not strictly numeric
 * 
 * @param {any} value - The value to extract
 * @returns {number|null} - Numeric value or null
 */
function extractStrictNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Convert to string and apply OCR corrections
  let strValue = String(value).trim();
  
  // OCR CORRECTION: Fix common decimal errors (same as isStrictlyNumeric)
  strValue = strValue.replace(/\.([0-9DOdoIiLl]+)$/g, (match, decimal) => {
    const corrected = decimal
      .replace(/D/gi, '0')  // D → 0
      .replace(/O/gi, '0')  // O → 0
      .replace(/I/gi, '1')  // I → 1
      .replace(/L/gi, '1'); // l → 1
    return '.' + corrected;
  });
  
  // Validate corrected value is numeric
  const numericPattern = /^\d+(\.\d+)?$/;
  if (!numericPattern.test(strValue)) {
    return null;
  }
  
  const numValue = parseFloat(strValue);
  
  // Check if conversion was successful
  if (isNaN(numValue)) {
    return null;
  }
  
  return numValue;
}

/**
 * Validate qualitative values
 * These are predefined text values for medical parameters
 * 
 * Valid examples:
 * - "Positive", "Negative"
 * - "Reactive", "Non-Reactive"
 * - "Normal", "Abnormal"
 * - "Absent", "Present", "Trace", "Few", "Moderate", "Many"
 * - "Nil", "+"
 * 
 * @param {string} value - The value to validate
 * @returns {boolean} - True if value is a valid qualitative value
 */
function isValidQualitativeValue(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const lowerValue = value.toLowerCase().trim();
  
  // Empty string is not valid
  if (lowerValue === '') {
    return false;
  }
  
  // Define valid qualitative patterns
  const qualitativePatterns = [
    // Positive/Negative (including truncated OCR versions like NEGATIV, POSITIV)
    /^(positive?|negative?|positiv?|negativ?|negati?|positi?|pos|neg)$/,
    
    // Reactive/Non-Reactive
    /^(reactive|non-reactive|non reactive|nonreactive)$/,
    
    // Normal/Abnormal
    /^(normal|abnormal)$/,
    
    // Presence indicators
    /^(absent|present|nil|trace|few|rare|moderate|many|numerous|plenty)$/,
    
    // Microscopic indicators (for urine microscopy)
    /^(nil|occasional|scanty|plenty|loaded)$/,
    /^(few|rare|moderate|many|numerous)\s+(seen|present|per hpf|\/hpf)?$/,
    
    // Appearance
    /^(clear|cloudy|turbid|hazy|transparent|opaque)$/,
    
    // Color
    /^(yellow|amber|straw|colorless|red|brown|orange)$/,
    
    // Plus notation (including standalone + symbols)
    /^(\+{1,4}|1\+|2\+|3\+|4\+|\+)$/,
    
    // Appearance descriptors
    /^(slightly\s+turbid|slightly\s+cloudy|pale\s+yellow|light\s+yellow|dark\s+yellow|yellow\s+pale|turbid\s+slightly)$/,
    
    // Any combination of appearance/color words (up to 3 words)
    /^(slightly|pale|light|dark|yellow|amber|straw|clear|turbid|cloudy|red|brown|orange)(\s+(slightly|pale|light|dark|yellow|amber|straw|clear|turbid|cloudy|red|brown|orange)){0,2}$/,
    
    // Ranges for qualitative
    /^(\d+\-\d+)$/,
    
    // Blood group
    /^(a|b|ab|o)(\+|-)?$/,
    
    // Within normal limits
    /^(wnl|within normal limits)$/,
    
    // Detected/Not detected
    /^(detected|not detected|nd)$/,
    
    // Seen/Not seen
    /^(seen|not seen|few seen|rare seen)$/,
  ];
  
  for (const pattern of qualitativePatterns) {
    if (pattern.test(lowerValue)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate and clean extracted value based on parameter type
 * 
 * @param {string} parameterName - The parameter name
 * @param {any} value - The extracted value
 * @param {string} expectedType - "NUMERIC", "QUALITATIVE", or "MIXED"
 * @returns {object|null} - { isValid: boolean, cleanValue: any, reason: string }
 */
function validateExtractedValue(parameterName, value, expectedType) {
  // Check if value exists
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      cleanValue: null,
      reason: 'Value is empty or null'
    };
  }
  
  const strValue = String(value).trim();
  
  // NUMERIC parameter validation
  if (expectedType === 'NUMERIC') {
    if (!isStrictlyNumeric(strValue)) {
      return {
        isValid: false,
        cleanValue: null,
        reason: `Expected numeric value for ${parameterName}, got: "${strValue}"`
      };
    }
    
    const numValue = extractStrictNumericValue(strValue);
    
    if (numValue === null) {
      return {
        isValid: false,
        cleanValue: null,
        reason: `Failed to parse numeric value: "${strValue}"`
      };
    }
    
    // Additional sanity checks for numeric values
    if (numValue < 0) {
      return {
        isValid: false,
        cleanValue: null,
        reason: `Negative value not allowed: ${numValue}`
      };
    }
    
    if (numValue > 1000000) {
      return {
        isValid: false,
        cleanValue: null,
        reason: `Value too large (likely not medical data): ${numValue}`
      };
    }
    
    return {
      isValid: true,
      cleanValue: numValue,
      reason: 'Valid numeric value'
    };
  }
  
  // QUALITATIVE parameter validation
  if (expectedType === 'QUALITATIVE') {
    if (!isValidQualitativeValue(strValue)) {
      return {
        isValid: false,
        cleanValue: null,
        reason: `Expected qualitative value for ${parameterName}, got: "${strValue}"`
      };
    }
    
    return {
      isValid: true,
      cleanValue: strValue,
      reason: 'Valid qualitative value'
    };
  }
  
  // MIXED parameter validation (accepts both)
  if (expectedType === 'MIXED') {
    // Try numeric first
    if (isStrictlyNumeric(strValue)) {
      const numValue = extractStrictNumericValue(strValue);
      if (numValue !== null && numValue >= 0 && numValue <= 1000000) {
        return {
          isValid: true,
          cleanValue: numValue,
          reason: 'Valid numeric value (mixed type)'
        };
      }
    }
    
    // Try qualitative
    if (isValidQualitativeValue(strValue)) {
      return {
        isValid: true,
        cleanValue: strValue,
        reason: 'Valid qualitative value (mixed type)'
      };
    }
    
    return {
      isValid: false,
      cleanValue: null,
      reason: `Expected numeric or qualitative value for ${parameterName}, got: "${strValue}"`
    };
  }
  
  return {
    isValid: false,
    cleanValue: null,
    reason: `Unknown parameter type: ${expectedType}`
  };
}

/**
 * Filter out non-numeric garbage from extraction results
 * 
 * @param {Array} extractedResults - Array of {parameter, value, unit}
 * @param {Function} getParameterTypeFn - Function to get parameter type
 * @returns {Array} - Filtered results with only valid values
 */
function filterValidResults(extractedResults, getParameterTypeFn) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return [];
  }
  
  const validResults = [];
  const rejectedResults = [];
  
  for (const result of extractedResults) {
    const { parameter, value, unit } = result;
    
    // Get expected type for this parameter
    const expectedType = getParameterTypeFn(parameter);
    
    // Validate the value
    const validation = validateExtractedValue(parameter, value, expectedType);
    
    if (validation.isValid) {
      validResults.push({
        ...result,
        value: validation.cleanValue, // Use cleaned value
        validationType: expectedType
      });
      console.log(`✅ VALID: ${parameter} = ${validation.cleanValue} (${expectedType})`);
    } else {
      rejectedResults.push({
        parameter,
        rejectedValue: value,
        reason: validation.reason
      });
      console.log(`❌ REJECTED: ${parameter} = "${value}" - ${validation.reason}`);
    }
  }
  
  // Log summary
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid: ${validResults.length}`);
  console.log(`   ❌ Rejected: ${rejectedResults.length}`);
  
  return validResults;
}

/**
 * Special validation for BLOOD_SUGAR reports
 * Only extracts glucose-related numeric values
 * 
 * @param {Array} extractedResults - Raw extraction results
 * @returns {Array} - Filtered blood sugar results
 */
function validateBloodSugarReport(extractedResults) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return [];
  }
  
  // Valid blood sugar parameter keywords (check if parameter contains these)
  const bloodSugarKeywords = [
    'glucose',
    'blood sugar',
    'sugar',
    'hba1c',
    'a1c',
    'abg',
    'fasting',
    'post prandial',
    'pp',
    'random'
  ];
  
  const validResults = [];
  const deduplicationMap = new Map(); // Map standardKey -> bestResult
  
  for (const result of extractedResults) {
    const { parameter, value } = result;
    
    // Check if parameter is a blood sugar parameter (contains any keyword)
    const lowerParam = parameter.toLowerCase().trim();
    const isBloodSugarParam = bloodSugarKeywords.some(keyword => 
      lowerParam.includes(keyword)
    );
    
    if (!isBloodSugarParam) {
      console.log(`⚠️  BLOOD_SUGAR REPORT: Skipping non-glucose parameter: ${parameter}`);
      continue;
    }
    
    // Validate that value is numeric
    if (!isStrictlyNumeric(value)) {
      console.log(`❌ BLOOD_SUGAR REPORT: Rejecting non-numeric value for ${parameter}: "${value}"`);
      continue;
    }
    
    const numValue = extractStrictNumericValue(value);
    
    if (numValue === null) {
      console.log(`❌ BLOOD_SUGAR REPORT: Failed to parse value for ${parameter}: "${value}"`);
      continue;
    }
    
    // Sanity check for blood sugar ranges (typically 20-600 mg/dL)
    if (numValue < 10 || numValue > 800) {
      console.log(`⚠️  BLOOD_SUGAR REPORT: Value out of typical range for ${parameter}: ${numValue}`);
      // Still include it, but log the warning
    }
    
    // Map to standard key for deduplication
    let standardKey = 'unknown';
    if (/fasting/i.test(lowerParam)) {
      standardKey = 'fasting_glucose';
    } else if (/post\s*prandial|pp/i.test(lowerParam)) {
      standardKey = 'postprandial_glucose';
    } else if (/random/i.test(lowerParam)) {
      standardKey = 'random_glucose';
    } else if (/hba1c|a1c/i.test(lowerParam)) {
      standardKey = 'hba1c';
    } else {
      // Generic glucose - treat as fasting by default
      standardKey = 'fasting_glucose';
    }
    
    const normalizedResult = {
      ...result,
      value: numValue
    };
    
    // Deduplication logic: keep the best result for each standard key
    if (deduplicationMap.has(standardKey)) {
      const existing = deduplicationMap.get(standardKey);
      
      // Prefer results with reference ranges
      const hasReferenceRange = result.referenceRange !== undefined && result.referenceRange !== null;
      const existingHasReferenceRange = existing.referenceRange !== undefined && existing.referenceRange !== null;
      
      if (hasReferenceRange && !existingHasReferenceRange) {
        console.log(`🔄 Replacing ${standardKey}: "${existing.parameter}" with "${parameter}" (has reference range)`);
        deduplicationMap.set(standardKey, normalizedResult);
      } else {
        console.log(`⏩ Skipping duplicate ${standardKey}: "${parameter}" (keeping "${existing.parameter}")`);
      }
    } else {
      deduplicationMap.set(standardKey, normalizedResult);
      console.log(`✅ BLOOD_SUGAR REPORT: ${parameter} = ${numValue}`);
    }
  }
  
  // Convert map to array
  return Array.from(deduplicationMap.values());
}

/**
 * Special validation for LIPID reports
 * Only extracts lipid-related numeric values (cholesterol, triglycerides, etc.)
 * 
 * @param {Array} extractedResults - Raw extraction results
 * @returns {Array} - Filtered lipid results
 */
function validateLipidReport(extractedResults) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return [];
  }
  
  // Valid lipid parameter keywords (check if parameter contains these)
  const lipidKeywords = [
    'cholesterol',
    'chalesteral',   // Common OCR misspelling
    'cholestrol',    // Another common misspelling
    'chalesterol',   // Another variant
    'triglyceride',
    'hdl',
    'ldl',
    'vldl',
    'chol',
    'trig',
    'lipid',
    'non-hdl',
    'non hdl'
  ];
  
  // Keywords that indicate it's NOT a lipid parameter (e.g., "Age", "Sex", "UHID")
  const excludeKeywords = [
    'age',
    'sex',
    'uhid',
    'sample',
    'collected',
    'ref.',
    'dr.',
    'by:',
    'registered',
    'reported',
    'patient',
    'name',
    'date',
    'time',
    'day',
    'normal',
    'tat',
    'type',
    'gp:',
    'pm',
    'am',
    'dec',
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov'
  ];
  
  const validResults = [];
  const deduplicationMap = new Map(); // Map standardKey -> bestResult
  
  for (const result of extractedResults) {
    const { parameter, value, unit } = result;
    
    // Check if parameter contains exclude keywords
    const lowerParam = parameter.toLowerCase().trim();
    const isExcluded = excludeKeywords.some(keyword => 
      lowerParam.includes(keyword)
    );
    
    if (isExcluded) {
      console.log(`⚠️  LIPID REPORT: Skipping non-lipid parameter: ${parameter}`);
      continue;
    }
    
    // Check if parameter is a lipid parameter (contains any keyword)
    const isLipidParam = lipidKeywords.some(keyword => 
      lowerParam.includes(keyword)
    );
    
    if (!isLipidParam) {
      console.log(`⚠️  LIPID REPORT: Skipping non-lipid parameter: ${parameter}`);
      continue;
    }
    
    // Validate that value is numeric
    if (!isStrictlyNumeric(value)) {
      console.log(`❌ LIPID REPORT: Rejecting non-numeric value for ${parameter}: "${value}"`);
      continue;
    }
    
    const numValue = extractStrictNumericValue(value);
    
    if (numValue === null) {
      console.log(`❌ LIPID REPORT: Failed to parse value for ${parameter}: "${value}"`);
      continue;
    }
    
    // STRICT sanity check for lipid ranges - REJECT out-of-range values
    // Non-HDL: typically 50-400 mg/dL (check BEFORE hdl to avoid false match)
    // HDL: typically 10-150 mg/dL
    // VLDL: typically 5-100 mg/dL (check BEFORE ldl to avoid false match)
    // LDL: typically 0-300 mg/dL
    // Total Cholesterol: typically 50-500 mg/dL
    // Triglycerides: typically 30-1000 mg/dL
    // Ratios: typically 0.5-15
    
    let isValidRange = true;
    let rangeError = '';
    
    // CHECK ORDER MATTERS! Check more specific patterns first (non-hdl before hdl, vldl before ldl)
    if (lowerParam.includes('ratio')) {
      // Ratios should be between 0.1 and 15
      if (numValue < 0.1 || numValue > 15) {
        isValidRange = false;
        rangeError = `Ratio out of range (0.1-15): ${numValue}`;
      }
    } else if (lowerParam.includes('non-hdl') || lowerParam.includes('non hdl')) {
      // Non-HDL Cholesterol: 50-400 mg/dL
      if (numValue < 50 || numValue > 400) {
        isValidRange = false;
        rangeError = `Non-HDL Cholesterol out of range (50-400): ${numValue}`;
      }
    } else if (lowerParam.includes('vldl')) {
      // VLDL: 5-100 mg/dL
      if (numValue < 5 || numValue > 100) {
        isValidRange = false;
        rangeError = `VLDL out of range (5-100): ${numValue}`;
      }
    } else if (lowerParam.includes('hdl')) {
      // HDL: 10-150 mg/dL
      if (numValue < 10 || numValue > 150) {
        isValidRange = false;
        rangeError = `HDL out of range (10-150): ${numValue}`;
      }
    } else if (lowerParam.includes('ldl')) {
      // LDL: 20-300 mg/dL (0 is medically impossible - likely OCR error)
      if (numValue < 20 || numValue > 300) {
        isValidRange = false;
        rangeError = `LDL out of range (20-300): ${numValue}`;
      }
    } else if (lowerParam.includes('triglyceride') || lowerParam.includes('trig')) {
      // Triglycerides: 20-1000 mg/dL (very low values are OCR errors)
      if (numValue < 20 || numValue > 1000) {
        isValidRange = false;
        rangeError = `Triglycerides out of range (20-1000): ${numValue}`;
      }
    } else if (lowerParam.includes('cholesterol') || lowerParam.includes('chalesteral') || lowerParam.includes('cholestrol') || lowerParam.includes('chol')) {
      // Total/Non-HDL Cholesterol: 100-500 mg/dL (very low values are OCR errors)
      if (numValue < 100 || numValue > 500) {
        isValidRange = false;
        rangeError = `Cholesterol out of range (100-500): ${numValue}`;
      }
    }
    
    if (!isValidRange) {
      console.log(`❌ LIPID REPORT: ${rangeError}`);
      continue; // REJECT this value
    }
    
    // Map to standard key for deduplication
    let standardKey = 'unknown';
    if (lowerParam.includes('non-hdl') || lowerParam.includes('non hdl')) {
      standardKey = 'non_hdl_cholesterol';
    } else if (lowerParam.includes('vldl')) {
      standardKey = 'vldl_cholesterol';
    } else if (lowerParam.includes('hdl')) {
      standardKey = 'hdl_cholesterol';
    } else if (lowerParam.includes('ldl')) {
      standardKey = 'ldl_cholesterol';
    } else if (lowerParam.includes('triglyceride') || lowerParam.includes('trig')) {
      standardKey = 'triglycerides';
    } else if (lowerParam.includes('total') && (lowerParam.includes('cholesterol') || lowerParam.includes('chol'))) {
      standardKey = 'total_cholesterol';
    } else if (lowerParam.includes('cholesterol') || lowerParam.includes('chol')) {
      standardKey = 'total_cholesterol';
    } else if (lowerParam.includes('ratio')) {
      standardKey = 'cholesterol_ratio';
    }
    
    const normalizedResult = {
      ...result,
      value: numValue
    };
    
    // Deduplication logic: keep the best result for each standard key
    if (deduplicationMap.has(standardKey)) {
      const existing = deduplicationMap.get(standardKey);
      
      // Scoring system to determine which result is better
      let currentScore = 0;
      let existingScore = 0;
      
      // 1. Prefer correct units (mg/dL, mmol/L) over garbled units
      const validUnits = ['mg/dl', 'mg/dL', 'mmol/l', 'mmol/L'];
      const currentHasValidUnit = unit && validUnits.some(u => u.toLowerCase() === unit.toLowerCase());
      const existingHasValidUnit = existing.unit && validUnits.some(u => u.toLowerCase() === existing.unit.toLowerCase());
      
      if (currentHasValidUnit) currentScore += 10;
      if (existingHasValidUnit) existingScore += 10;
      
      // 2. Prefer results with reference ranges
      const hasReferenceRange = result.referenceRange !== undefined && result.referenceRange !== null;
      const existingHasReferenceRange = existing.referenceRange !== undefined && existing.referenceRange !== null;
      
      if (hasReferenceRange) currentScore += 5;
      if (existingHasReferenceRange) existingScore += 5;
      
      // 3. Prefer pattern extraction methods over row-based
      const isPatternExtraction = result.extractionMethod && result.extractionMethod.includes('pattern');
      const existingIsPatternExtraction = existing.extractionMethod && existing.extractionMethod.includes('pattern');
      
      if (isPatternExtraction) currentScore += 3;
      if (existingIsPatternExtraction) existingScore += 3;
      
      // Replace if current score is better
      if (currentScore > existingScore) {
        console.log(`🔄 Replacing ${standardKey}: "${existing.parameter}" (score ${existingScore}) with "${parameter}" (score ${currentScore})`);
        console.log(`   Old: value=${existing.value}, unit="${existing.unit || 'N/A'}"`);
        console.log(`   New: value=${numValue}, unit="${unit || 'N/A'}"`);
        deduplicationMap.set(standardKey, normalizedResult);
      } else {
        console.log(`⏩ Skipping duplicate ${standardKey}: "${parameter}" (score ${currentScore} <= ${existingScore})`);
      }
    } else {
      deduplicationMap.set(standardKey, normalizedResult);
      console.log(`✅ LIPID REPORT: ${parameter} = ${numValue}`);
    }
  }
  
  // Convert map to array
  const deduplicated = Array.from(deduplicationMap.values());
  
  console.log(`\n📊 LIPID Deduplication Summary:`);
  console.log(`   📥 Input: ${extractedResults.length} results`);
  console.log(`   📤 Output: ${deduplicated.length} results (removed ${extractedResults.length - deduplicated.length} duplicates)`);
  
  return deduplicated;
}

/**
 * Special validation for THYROID reports
 * Only extracts thyroid-related numeric values
 * 
 * @param {Array} extractedResults - Raw extraction results
 * @returns {Array} - Filtered thyroid results
 */
function validateThyroidReport(extractedResults) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return [];
  }
  
  // Valid thyroid parameter keywords (check if parameter contains these)
  const thyroidKeywords = [
    't3',
    't4',
    'tsh',
    'triiodothyronine',
    'triodothyronine',
    'thyroxine',
    'thyroid stimulating hormone',
    'free t3',
    'free t4',
    'ft3',
    'ft4',
    'total t3',
    'total t4'
  ];
  
  // Keywords that indicate it's NOT a thyroid parameter
  const excludeKeywords = [
    'age',
    'sex',
    'gender',
    'lab no',
    'ref by',
    'collected',
    'reported',
    'status',
    'patient',
    'name',
    'date',
    'time',
    'method',
    'cmia',
    'note',
    'plot',
    'nursing',
    'home',
    'road',
    'near',
    'pump',
    'phone',
    'email',
    'hospital',
    'clinic',
    'lab',
    'pathology',
    'processed',
    'bilaspur',
    'reg',
    'notional',
    'beferinee',
    'dubey'
  ];
  
  const validResults = [];
  const deduplicationMap = new Map(); // Map standardKey -> bestResult
  
  for (const result of extractedResults) {
    const { parameter, value, unit } = result;
    
    // Check if parameter contains exclude keywords
    const lowerParam = parameter.toLowerCase().trim();
    const isExcluded = excludeKeywords.some(keyword => 
      lowerParam.includes(keyword)
    );
    
    if (isExcluded) {
      console.log(`⚠️  THYROID REPORT: Skipping non-thyroid parameter: ${parameter}`);
      continue;
    }
    
    // Check if parameter is a thyroid parameter (contains any keyword)
    const isThyroidParam = thyroidKeywords.some(keyword => 
      lowerParam.includes(keyword)
    );
    
    if (!isThyroidParam) {
      console.log(`⚠️  THYROID REPORT: Skipping non-thyroid parameter: ${parameter}`);
      continue;
    }
    
    // Validate that value is numeric
    if (!isStrictlyNumeric(value)) {
      console.log(`❌ THYROID REPORT: Rejecting non-numeric value for ${parameter}: "${value}"`);
      continue;
    }
    
    const numValue = extractStrictNumericValue(value);
    
    if (numValue === null) {
      console.log(`❌ THYROID REPORT: Failed to parse value for ${parameter}: "${value}"`);
      continue;
    }
    
    // STRICT sanity check for thyroid ranges
    // T3: typically 60-200 ng/dL
    // T4: typically 4.5-12 ug/dL
    // TSH: typically 0.3-5 uIU/mL
    // Free T3: typically 2-4 pg/mL
    // Free T4: typically 0.8-2 ng/dL
    
    let isValidRange = true;
    let rangeError = '';
    
    if (lowerParam.includes('tsh')) {
      // TSH: 0.1-10 uIU/mL (allow wider range for hypo/hyperthyroidism)
      if (numValue < 0.01 || numValue > 100) {
        isValidRange = false;
        rangeError = `TSH out of range (0.01-100): ${numValue}`;
      }
    } else if (lowerParam.includes('free t4') || lowerParam.includes('ft4')) {
      // Free T4: 0.5-3 ng/dL
      if (numValue < 0.1 || numValue > 5) {
        isValidRange = false;
        rangeError = `Free T4 out of range (0.1-5): ${numValue}`;
      }
    } else if (lowerParam.includes('free t3') || lowerParam.includes('ft3')) {
      // Free T3: 1-6 pg/mL
      if (numValue < 0.5 || numValue > 10) {
        isValidRange = false;
        rangeError = `Free T3 out of range (0.5-10): ${numValue}`;
      }
    } else if (lowerParam.includes('t4') || lowerParam.includes('thyroxine')) {
      // Total T4: 4-13 ug/dL
      if (numValue < 1 || numValue > 20) {
        isValidRange = false;
        rangeError = `T4 out of range (1-20): ${numValue}`;
      }
    } else if (lowerParam.includes('t3') || lowerParam.includes('triiodothyronine') || lowerParam.includes('triodothyronine')) {
      // Total T3: 50-250 ng/dL
      if (numValue < 20 || numValue > 500) {
        isValidRange = false;
        rangeError = `T3 out of range (20-500): ${numValue}`;
      }
    }
    
    if (!isValidRange) {
      console.log(`❌ THYROID REPORT: ${rangeError}`);
      continue; // REJECT this value
    }
    
    // Map to standard key for deduplication
    let standardKey = 'unknown';
    if (lowerParam.includes('tsh')) {
      standardKey = 'tsh';
    } else if (lowerParam.includes('free t4') || lowerParam.includes('ft4')) {
      standardKey = 'free_t4';
    } else if (lowerParam.includes('free t3') || lowerParam.includes('ft3')) {
      standardKey = 'free_t3';
    } else if (lowerParam.includes('t4') || lowerParam.includes('thyroxine')) {
      standardKey = 'total_t4';
    } else if (lowerParam.includes('t3') || lowerParam.includes('triiodothyronine') || lowerParam.includes('triodothyronine')) {
      standardKey = 'total_t3';
    }
    
    const normalizedResult = {
      ...result,
      value: numValue
    };
    
    // Unit correction for thyroid parameters (OCR often misreads ug/dL as pg/dL)
    let correctedUnit = unit;
    if (standardKey === 'total_t4' && unit) {
      const lowerUnit = unit.toLowerCase().replace(/\s/g, '');
      // Total T4 should be in ug/dL or µg/dL, NOT pg/dL
      // pg/dL is for Free T4, which is 1000x smaller
      if (lowerUnit === 'pg/dl' || lowerUnit === 'pg/dl') {
        correctedUnit = 'ug/dL';
        console.log(`   🔧 Corrected T4 unit: "${unit}" → "ug/dL" (OCR error: picogram→microgram)`);
        normalizedResult.unit = correctedUnit;
      }
    }
    
    // Deduplication logic: keep the best result for each standard key
    if (deduplicationMap.has(standardKey)) {
      const existing = deduplicationMap.get(standardKey);
      
      // Scoring system to determine which result is better
      let currentScore = 0;
      let existingScore = 0;
      
      // 1. Prefer correct units
      const validUnits = {
        'tsh': ['uiu/ml', 'miu/l', 'µiu/ml'],
        'total_t3': ['ng/dl', 'nmol/l'],
        'total_t4': ['ug/dl', 'µg/dl', 'nmol/l'],
        'free_t3': ['pg/ml', 'pmol/l'],
        'free_t4': ['ng/dl', 'pmol/l']
      };
      
      const expectedUnits = validUnits[standardKey] || [];
      const currentHasValidUnit = unit && expectedUnits.some(u => unit.toLowerCase().replace(/\s/g, '') === u);
      const existingHasValidUnit = existing.unit && expectedUnits.some(u => existing.unit.toLowerCase().replace(/\s/g, '') === u);
      
      if (currentHasValidUnit) currentScore += 10;
      if (existingHasValidUnit) existingScore += 10;
      
      // 2. Prefer results with reference ranges
      const hasReferenceRange = result.referenceRange !== undefined && result.referenceRange !== null;
      const existingHasReferenceRange = existing.referenceRange !== undefined && existing.referenceRange !== null;
      
      if (hasReferenceRange) currentScore += 5;
      if (existingHasReferenceRange) existingScore += 5;
      
      // Replace if current score is better
      if (currentScore > existingScore) {
        console.log(`🔄 Replacing ${standardKey}: "${existing.parameter}" (score ${existingScore}) with "${parameter}" (score ${currentScore})`);
        deduplicationMap.set(standardKey, normalizedResult);
      } else {
        console.log(`⏩ Skipping duplicate ${standardKey}: "${parameter}" (score ${currentScore} <= ${existingScore})`);
      }
    } else {
      deduplicationMap.set(standardKey, normalizedResult);
      console.log(`✅ THYROID REPORT: ${parameter} = ${numValue}`);
    }
  }
  
  // Convert map to array
  const deduplicated = Array.from(deduplicationMap.values());
  
  console.log(`\n📊 THYROID Deduplication Summary:`);
  console.log(`   📥 Input: ${extractedResults.length} results`);
  console.log(`   📤 Output: ${deduplicated.length} results (removed ${extractedResults.length - deduplicated.length} duplicates)`);
  
  return deduplicated;
}

/**
 * Special validation for CBC (Complete Blood Count) reports
 * Validates blood cell counts and percentages
 * 
 * @param {Array} extractedResults - Raw extraction results
 * @returns {Array} - Filtered CBC results
 */
function validateCBCReport(extractedResults) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return [];
  }
  
  // Valid CBC parameter keywords
  const cbcKeywords = [
    'hemoglobin',
    'haemoglobin',
    'hb',
    'rbc',
    'red blood cell',
    'wbc',
    'white blood cell',
    'leucocyte',
    'leukocyte',
    'platelet',
    'neutrophil',
    'lymphocyte',
    'monocyte',
    'eosinophil',
    'basophil',
    'hematocrit',
    'haematocrit',
    'hct',
    'mcv',
    'mch',
    'mchc',
    'rdw',
    'mpv',
    'pct',
    'pdw'
  ];
  
  // Exclude keywords
  const excludeKeywords = [
    'age',
    'sex',
    'gender',
    'patient',
    'name',
    'date',
    'time',
    'report',
    'collection',
    'phone',
    'referred',
    'description',
    'interpretation'
  ];
  
  const validResults = [];
  const deduplicationMap = new Map();
  
  for (const result of extractedResults) {
    const { parameter, value, unit } = result;
    
    // Check exclusion keywords
    const lowerParam = parameter.toLowerCase().trim();
    const isExcluded = excludeKeywords.some(keyword => lowerParam.includes(keyword));
    
    if (isExcluded) {
      console.log(`⚠️  CBC REPORT: Skipping non-CBC parameter: ${parameter}`);
      continue;
    }
    
    // Check if it's a CBC parameter
    const isCBCParam = cbcKeywords.some(keyword => lowerParam.includes(keyword));
    
    if (!isCBCParam) {
      console.log(`⚠️  CBC REPORT: Skipping non-CBC parameter: ${parameter}`);
      continue;
    }
    
    // Validate numeric value
    if (!isStrictlyNumeric(value)) {
      console.log(`❌ CBC REPORT: Rejecting non-numeric value for ${parameter}: "${value}"`);
      continue;
    }
    
    const numValue = extractStrictNumericValue(value);
    
    if (numValue === null) {
      console.log(`❌ CBC REPORT: Failed to parse value for ${parameter}: "${value}"`);
      continue;
    }
    
    // Fix unit if it's a reference value instead of actual unit
    let correctedUnit = unit;
    
    // Check if unit is actually a number (likely reference value)
    if (unit && !isNaN(parseFloat(unit))) {
      console.log(`   🔧 Unit correction for ${parameter}: "${unit}" is a number (likely reference max)`);
      
      // Determine correct unit based on parameter type
      if (lowerParam.includes('neutrophil') || lowerParam.includes('lymphocyte') || 
          lowerParam.includes('eosinophil') || lowerParam.includes('basophil') || 
          lowerParam.includes('monocyte')) {
        if (lowerParam.includes('absolute')) {
          correctedUnit = '/cumm';
        } else {
          correctedUnit = '%';
        }
      } else if (lowerParam.includes('hemoglobin') || lowerParam.includes('haemoglobin')) {
        correctedUnit = 'g/dL';
      } else if (lowerParam.includes('leucocyte count') || lowerParam.includes('leukocyte count') ||
                 lowerParam.includes('wbc')) {
        correctedUnit = '/cumm';
      } else if (lowerParam.includes('platelet')) {
        correctedUnit = '/cumm';
      } else if (lowerParam.includes('rbc count')) {
        correctedUnit = 'million/cumm';
      } else if (lowerParam.includes('mcv')) {
        correctedUnit = 'fL';
      } else if (lowerParam.includes('mch') && !lowerParam.includes('mchc')) {
        correctedUnit = 'pg';
      } else if (lowerParam.includes('mchc')) {
        correctedUnit = 'g/dL';
      } else if (lowerParam.includes('hct') || lowerParam.includes('hematocrit')) {
        correctedUnit = '%';
      } else if (lowerParam.includes('rdw')) {
        correctedUnit = '%';
      } else if (lowerParam.includes('mpv')) {
        correctedUnit = 'fL';
      }
      
      console.log(`   → Corrected to: "${correctedUnit}"`);
    }
    
    // CRITICAL: Validate percentage values
    if (correctedUnit === '%' || (unit && unit.toLowerCase() === '%')) {
      if (numValue > 100) {
        console.log(`❌ CBC REPORT: Percentage value > 100% for ${parameter}: ${numValue}% (likely OCR concatenation error)`);
        console.log(`   → This suggests "50 40" was read as "5040" instead of value=50, ref=40`);
        continue; // REJECT impossible percentage
      }
    }
    
    // Sanity check ranges for key CBC parameters
    let isValidRange = true;
    let rangeError = '';
    
    if (lowerParam.includes('hemoglobin') || lowerParam.includes('haemoglobin')) {
      // Hemoglobin: 5-20 g/dL
      if (numValue < 3 || numValue > 25) {
        isValidRange = false;
        rangeError = `Hemoglobin out of range (3-25): ${numValue}`;
      }
    } else if (lowerParam.includes('platelet') && !lowerParam.includes('mean')) {
      // Platelet count: 50,000-800,000 /cumm
      if (numValue < 10000 || numValue > 1000000) {
        isValidRange = false;
        rangeError = `Platelet count out of range (10K-1M): ${numValue}`;
      }
    } else if (lowerParam.includes('total') && (lowerParam.includes('leucocyte') || lowerParam.includes('wbc'))) {
      // WBC: 1000-50000 /cumm
      if (numValue < 500 || numValue > 100000) {
        isValidRange = false;
        rangeError = `WBC count out of range (500-100K): ${numValue}`;
      }
    }
    
    if (!isValidRange) {
      console.log(`❌ CBC REPORT: ${rangeError}`);
      continue;
    }
    
    // Map to standard key
    let standardKey = lowerParam.replace(/\s+/g, '_');
    
    const normalizedResult = {
      ...result,
      value: numValue,
      unit: correctedUnit
    };
    
    // Deduplication
    if (deduplicationMap.has(standardKey)) {
      const existing = deduplicationMap.get(standardKey);
      
      // Prefer results with correct units
      let currentScore = 0;
      let existingScore = 0;
      
      if (correctedUnit && correctedUnit !== '' && !isNaN(parseFloat(correctedUnit))) {
        currentScore += 5;
      }
      if (existing.unit && existing.unit !== '' && !isNaN(parseFloat(existing.unit))) {
        existingScore += 5;
      }
      
      if (currentScore > existingScore) {
        console.log(`🔄 Replacing ${standardKey}: "${existing.parameter}" with "${parameter}"`);
        deduplicationMap.set(standardKey, normalizedResult);
      } else {
        console.log(`⏩ Skipping duplicate ${standardKey}: "${parameter}"`);
      }
    } else {
      deduplicationMap.set(standardKey, normalizedResult);
      console.log(`✅ CBC REPORT: ${parameter} = ${numValue} ${correctedUnit}`);
    }
  }
  
  const deduplicated = Array.from(deduplicationMap.values());
  
  console.log(`\n📊 CBC Deduplication Summary:`);
  console.log(`   📥 Input: ${extractedResults.length} results`);
  console.log(`   📤 Output: ${deduplicated.length} results (removed ${extractedResults.length - deduplicated.length} duplicates)`);
  
  return deduplicated;
}

module.exports = {
  isStrictlyNumeric,
  extractStrictNumericValue,
  isValidQualitativeValue,
  validateExtractedValue,
  filterValidResults,
  validateBloodSugarReport,
  validateLipidReport,
  validateThyroidReport,
  validateCBCReport,
};
