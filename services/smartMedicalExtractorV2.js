/**
 * Smart Medical Extractor V2 - Production Ready
 * 
 * Dictionary-based extraction using masterDictionary.json
 * Provides accurate parameter matching with predefined medical vocabulary
 * and report type detection
 */

const { loadDictionary } = require('./dictionary/dictionaryLoader');
const reportTypeDetector = require('./reportTypeDetector');
const { normalizeUnit } = require('./normalizer');
const { extractCBCWithColumns } = require('./cbcColumnExtractor');

/**
 * Main extraction function
 * @param {string} ocrText - OCR extracted text from medical report
 * @returns {Promise<Object>} Extraction result with report type and parameters
 */
async function smartMedicalExtractorV2(ocrText) {
  console.log('\n🔬 SMART MEDICAL EXTRACTOR V2 (Dictionary-Based)');
  console.log('='.repeat(70));

  // STEP 1: Load dictionary
  let dictionary;
  try {
    dictionary = loadDictionary();
    console.log('✅ Dictionary loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load dictionary:', error.message);
    return {
      reportType: 'UNKNOWN',
      parameters: [],
      averageConfidence: 0
    };
  }

  // Validate OCR text
  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10) {
    console.log('❌ OCR text is empty or too short');
    return {
      reportType: 'UNKNOWN',
      parameters: [],
      averageConfidence: 0
    };
  }

  // STEP 2: Detect report type
  const detectedType = reportTypeDetector.detectReportType(ocrText);
  
  if (!detectedType) {
    console.log('❌ Report type not detected');
    return {
      reportType: 'UNKNOWN',
      parameters: [],
      averageConfidence: 0
    };
  }

  console.log(`✅ Report type detected: ${detectedType}`);

  // STEP 2.5: Try specialized column-aware extraction for CBC reports
  if (detectedType === 'CBC') {
    console.log('🩸 Attempting column-aware CBC extraction...');
    const cbcParams = extractCBCWithColumns(ocrText);
    
    if (cbcParams && cbcParams.length > 0) {
      console.log(`✅ Column-aware CBC extraction successful: ${cbcParams.length} parameters`);
      
      const averageConfidence = calculateAverageConfidence(cbcParams);
      
      console.log('='.repeat(70));
      console.log(`📊 CBC Column-Aware Extraction: ${cbcParams.length} parameters`);
      console.log(`📊 Average Confidence: ${averageConfidence.toFixed(2)}\n`);
      
      return {
        reportType: detectedType,
        parameters: cbcParams,
        averageConfidence: averageConfidence,
        extractionVersion: 'V2-CBC-ColumnAware'
      };
    } else {
      console.log('⚠️  Column-aware CBC extraction failed, falling back to dictionary-based extraction');
    }
  }

  // STEP 3: Get parameter definitions for detected report type
  const reportTypeData = findReportTypeInDictionary(dictionary, detectedType);
  
  if (!reportTypeData) {
    console.log(`❌ No dictionary entry found for report type: ${detectedType}`);
    return {
      reportType: detectedType,
      parameters: [],
      averageConfidence: 0
    };
  }

  console.log(`✅ Found ${Object.keys(reportTypeData.parameters).length} parameter definitions`);

  // Normalize OCR text for matching
  const normalizedText = normalizeOcrText(ocrText);

  // STEP 4: Extract parameters
  const parameters = [];
  
  for (const [paramCode, paramData] of Object.entries(reportTypeData.parameters)) {
    const extraction = extractParameter(
      normalizedText,
      paramCode,
      paramData,
      ocrText  // Pass original text for better matching
    );

    if (extraction) {
      // STEP 5: Determine status
      const status = determineStatus(extraction.value, paramData.normalRange);

      parameters.push({
        code: paramCode,
        displayName: paramData.displayName,
        value: extraction.value,
        unit: extraction.unit,
        status: status,
        confidence: extraction.confidence
      });

      console.log(`   ✅ ${paramData.displayName}: ${extraction.value} ${extraction.unit} [${status}] (confidence: ${extraction.confidence.toFixed(2)})`);
    }
  }

  // STEP 6: Compute average confidence
  const averageConfidence = calculateAverageConfidence(parameters);

  console.log('='.repeat(70));
  console.log(`📊 V2 Extracted: ${parameters.length} parameters`);
  console.log(`📊 Average Confidence: ${averageConfidence.toFixed(2)}\n`);

  return {
    reportType: detectedType,
    parameters: parameters,
    averageConfidence: averageConfidence,
    extractionVersion: 'V2'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find report type data in dictionary by matching report type code
 */
function findReportTypeInDictionary(dictionary, reportTypeCode) {
  const reportTypes = dictionary.reportTypes;
  
  // Direct match
  if (reportTypes[reportTypeCode]) {
    return reportTypes[reportTypeCode];
  }

  // Try to find by matching common patterns
  const codeUpper = reportTypeCode.toUpperCase();
  
  // Map common detector codes to dictionary codes
  const mappings = {
    'GLUCOSE': 'DIABETES',
    'BLOOD_SUGAR': 'DIABETES',
    'THYROID': 'THYROID',
    'LIPID': 'LIPID',
    'CBC': 'CBC',
    'KFT': 'KFT',
    'LFT': 'LFT',
    'LIVER': 'LFT',
    'KIDNEY': 'KFT'
  };

  const mappedCode = mappings[codeUpper];
  if (mappedCode && reportTypes[mappedCode]) {
    return reportTypes[mappedCode];
  }

  // Search by display name
  for (const [code, data] of Object.entries(reportTypes)) {
    if (data.displayName.toUpperCase().includes(codeUpper)) {
      return data;
    }
  }

  return null;
}

/**
 * Normalize OCR text for better matching
 */
function normalizeOcrText(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Extract a single parameter from OCR text
 */
function extractParameter(normalizedText, paramCode, paramData, originalText) {
  const searchTerms = [
    paramData.displayName,
    ...paramData.synonyms
  ];

  const lowerText = normalizedText.toLowerCase();
  const valueType = paramData.valueType || 'numeric'; // Default to numeric

  for (let i = 0; i < searchTerms.length; i++) {
    const term = searchTerms[i];
    const isExactMatch = i === 0; // First term is the display name
    
    let extraction = null;
    
    // Try extraction based on value type
    if (valueType === 'qualitative') {
      // Only try qualitative extraction
      extraction = findQualitativeValue(lowerText, term, originalText);
    } else if (valueType === 'mixed') {
      // Try numeric first, then qualitative
      extraction = findValueNearLabel(lowerText, term, originalText, paramData.expectedUnits || []);
      if (!extraction) {
        extraction = findQualitativeValue(lowerText, term, originalText);
      }
    } else {
      // Default: numeric extraction
      extraction = findValueNearLabel(lowerText, term, originalText, paramData.expectedUnits || []);
    }
    
    if (extraction) {
      // Calculate confidence based on match type
      let confidence = 0.5; // Default partial match
      
      if (isExactMatch) {
        confidence = 0.9; // Exact match with display name
      } else {
        confidence = 0.75; // Synonym match
      }

      // Boost confidence if extraction quality is high
      if (extraction.quality === 'high') {
        confidence = Math.min(1.0, confidence + 0.1);
      }

      return {
        value: extraction.value,
        unit: normalizeUnit(extraction.unit || ''),
        confidence: confidence
      };
    }
  }

  return null;
}

/**
 * Find qualitative value near a label in text
 * Extracts text values like "NEGATIVE", "POSITIVE", "YELLOW", "CLEAR", etc.
 */
function findQualitativeValue(lowerText, label, originalText) {
  const escapedLabel = escapeRegex(label.toLowerCase());
  
  // Find the position of the label
  const labelRegex = new RegExp(`\\b${escapedLabel}\\b`, 'i');
  const matchIndex = lowerText.search(labelRegex);
  if (matchIndex === -1) {
    return null;
  }

  // Common qualitative values in medical reports (COMPREHENSIVE LIST)
  const qualitativeValues = [
    // Presence/Absence (Priority 1 - Most Common)
    'negative', 'positive', 'absent', 'present', 'nil', 'trace', 'traces',
    // Normal/Abnormal
    'normal', 'abnormal',
    // Colors (urine, specimens)
    'yellow', 'yellowish', 'pale yellow', 'dark yellow', 'amber', 'red', 'brown', 
    'colorless', 'colourless', 'straw', 'orange', 'green', 'clear yellow',
    // Appearance/Clarity
    'clear', 'turbid', 'slightly turbid', 'cloudy', 'hazy', 'milky', 'opaque',
    // pH descriptions
    'acidic', 'alkaline', 'neutral',
    // Quantity descriptors
    'few', 'few seen', 'moderate', 'many', 'plenty', 'numerous', 'scanty', 'occasional',
    // Microscopic findings (ranges)
    '0-1', '1-2', '2-3', '3-4', '4-5', '0-2', '1-3', '2-4', '2-5', '3-5',
    '0-1/hpf', '1-2/hpf', '2-3/hpf', '3-4/hpf', '4-5/hpf',
    '0-1/lpf', '1-2/lpf', '2-3/lpf',
    // Special values
    'reactive', 'non-reactive', 'detected', 'not detected'
  ];

  // Try line-level extraction first
  const lines = originalText.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(label.toLowerCase())) {
      // Extract qualitative value from line
      const lineResult = extractQualitativeFromWindow(line, escapedLabel, qualitativeValues);
      if (lineResult) {
        console.log(`  ✓ Qualitative line-level: ${label} = ${lineResult.value}`);
        return lineResult;
      }
    }
  }

  // Fall back to extended window extraction (includes next line)
  // This handles cases where label is on one line and value is on the next
  const searchWindow = originalText.slice(matchIndex, matchIndex + 150);
  const windowResult = extractQualitativeFromWindow(searchWindow, escapedLabel, qualitativeValues);
  if (windowResult) {
    console.log(`  ✓ Qualitative window: ${label} = ${windowResult.value}`);
    return windowResult;
  }

  return null;
}

/**
 * Extract qualitative value from a text window
 */
function extractQualitativeFromWindow(searchWindow, escapedLabel, qualitativeValues) {
  // Common method/technical terms to skip (not actual test values)
  const methodTerms = [
    'moditied', 'modified', 'ehrich', 'refractometric', 'double indicators',
    'protein error', 'indicator', 'oxidase', 'peroxidase', 'peroxıdase',
    'reaction', 'sodium nitropruside', 'sodıum nitropruside', 
    'oiazoisation', 'diazoisation', 'method', 'test'
  ];
  
  // Pattern: Label followed by qualitative value
  // Match the label, skip non-word chars, then capture the qualitative value
  // Try multi-word values first (e.g., "Pale Yellow", "Slightly Turbid")
  const multiWordValues = qualitativeValues.filter(v => v.includes(' '));
  const singleWordValues = qualitativeValues.filter(v => !v.includes(' '));
  
  // Try multi-word values first (more specific)
  for (const qualValue of multiWordValues) {
    const escapedQualValue = escapeRegex(qualValue);
    const pattern = new RegExp(
      `${escapedLabel}[^a-zA-Z]*?(${escapedQualValue})`,
      'i'
    );
    
    const match = searchWindow.match(pattern);
    if (match) {
      // Check if it's a method term - skip it
      const lowerValue = match[1].toLowerCase();
      if (methodTerms.some(term => lowerValue.includes(term))) {
        continue;
      }
      
      // Preserve original formatting for multi-word values
      const value = match[1].split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { value, unit: '', quality: 'high' };
    }
  }
  
  // Then try single-word values
  for (const qualValue of singleWordValues) {
    const escapedQualValue = escapeRegex(qualValue);
    const pattern = new RegExp(
      `${escapedLabel}[^a-zA-Z0-9/]*?(${escapedQualValue})(?:[^a-zA-Z]|$)`,
      'i'
    );
    
    const match = searchWindow.match(pattern);
    if (match) {
      // Check if it's a method term - skip it
      const lowerValue = match[1].toLowerCase();
      if (methodTerms.some(term => lowerValue.includes(term))) {
        continue;
      }
      
      // Capitalize first letter for consistency
      let value = match[1];
      // Special handling for specific formats
      if (value.match(/^\d+-\d+/)) {
        // Keep numeric ranges as-is (e.g., "2-3")
        value = value;
      } else if (value.toUpperCase() === value && value.length > 2) {
        // If all caps (like NEGATIVE), capitalize properly
        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      } else {
        value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return { value, unit: '', quality: 'high' };
    }
  }
  
  // Fallback: Try to capture any word after the label (within reason)
  const fallbackPattern = new RegExp(
    `${escapedLabel}[^a-zA-Z]*?([A-Z][A-Z]+|[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`,
    'i'
  );
  
  const fallbackMatch = searchWindow.match(fallbackPattern);
  if (fallbackMatch) {
    const value = fallbackMatch[1].trim();
    
    // Skip if it's a method term
    const lowerValue = value.toLowerCase();
    if (methodTerms.some(term => lowerValue.includes(term))) {
      return null;
    }
    
    // Only accept reasonable length values (2-30 characters)
    if (value.length >= 2 && value.length <= 30) {
      return { value, unit: '', quality: 'medium' };
    }
  }

  return null;
}

/**
 * Check if label exists in text as a standalone phrase (not as substring of another word)
 * Handles special characters (parentheses, slashes, etc.) correctly
 */
function labelExistsInLine(line, label) {
  const lineLower = line.toLowerCase();
  const labelLower = label.toLowerCase();
  
  const index = lineLower.indexOf(labelLower);
  if (index === -1) {
    return false;
  }
  
  // Check character before label (should be start of line or non-alphanumeric)
  if (index > 0) {
    const charBefore = lineLower[index - 1];
    // If previous character is alphanumeric or hyphen, it's part of a larger word (e.g., "non-hdl" contains "hdl")
    if (/[a-z0-9-]/.test(charBefore)) {
      return false;
    }
  }
  
  // Check character after label (should be end of line or non-alphanumeric)
  const endIndex = index + labelLower.length;
  if (endIndex < lineLower.length) {
    const charAfter = lineLower[endIndex];
    // If next character is alphanumeric or hyphen, label is part of a larger word
    if (/[a-z0-9-]/.test(charAfter)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Find first occurrence of label in text with word boundaries
 * Returns index of match, or -1 if not found
 */
function findLabelWithWordBoundary(text, label) {
  const textLower = text.toLowerCase();
  const labelLower = label.toLowerCase();
  
  let searchFrom = 0;
  while (true) {
    const index = textLower.indexOf(labelLower, searchFrom);
    if (index === -1) {
      return -1; // Not found
    }
    
    // Check if this is a word-boundary match
    const charBefore = index > 0 ? textLower[index - 1] : ' ';
    const charAfter = index + labelLower.length < textLower.length ? 
                      textLower[index + labelLower.length] : ' ';
    
    // Valid if surrounded by non-alphanumeric characters (treat hyphen as part of word)
    if (!/[a-z0-9-]/.test(charBefore) && !/[a-z0-9-]/.test(charAfter)) {
      return index; // Found valid match
    }
    
    // Continue searching from next position
    searchFrom = index + 1;
  }
}

/**
 * Find numeric value near a label in text
 * Uses line-level extraction first, then falls back to 100-character window
 */
function findValueNearLabel(lowerText, label, originalText, expectedUnits) {
  const escapedLabel = escapeRegex(label.toLowerCase());
  
  // Find the position of the label with word boundaries
  // This prevents "HDL Cholesterol" from matching inside "Non-HDL Cholesterol"
  const matchIndex = findLabelWithWordBoundary(lowerText, label);
  if (matchIndex === -1) {
    return null;
  }

  // PRIORITY 1: Try standalone number on next line (common in diabetes reports)
  // Format: "Fasting Blood Sugar  GOD & POD  mgs%  75- 110\n156"
  // Also handles: "HDL Cholesterol\n50.00 Normal > 40.00  mg/dL"
  const lines = originalText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (labelExistsInLine(line, label)) {
      // Found the label line, check next line for number
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // Try standalone number first (nothing else on line)
        const standaloneMatch = nextLine.match(/^(\d+\.?\d*)$/);
        if (standaloneMatch) {
          const value = parseFloat(standaloneMatch[1]);
          if (!isNaN(value) && value >= 0 && value < 100000000) {
            const unit = (expectedUnits && expectedUnits.length > 0) ? expectedUnits[0] : '';
            console.log(`  ✓ Next-line standalone number: ${label} = ${value} ${unit}`);
            return { value, unit, quality: 'high' };
          }
        }
        
        // Also try number at START of next line (even with other text after)
        // E.g., "50.00 Normal > 40.00  mg/dL" should extract 50.00
        const nextLineStartMatch = nextLine.match(/^(\d+\.?\d+)/);
        if (nextLineStartMatch) {
          const value = parseFloat(nextLineStartMatch[1]);
          if (!isNaN(value) && value >= 0 && value < 100000000) {
            // Extract unit from next line using regex
            const validUnitPattern = '(g[/ ]?d[lL]|g[/ ]?[lL]|mg[/ ]?d[lL]|mg[/ ]?[lL]|mgs%|mmol[/ ]?[lL]|pg[/ ]?m[lL]|ng[/ ]?d[lL]|ng[/ ]?m[lL]|ul[/ ]?m[lL]|iu[/ ]?m[lL]|iu[/ ]?[lL]|mill?[/ ]?mm3|thou[/ ]?mm3|cu\\.?mm|fL|fl|pg|%|gm%|gm[/ ]?d[lL]|cells[/ ]?mm3|thọu[/ ]?mm3)';
            const unitMatch = nextLine.match(new RegExp(validUnitPattern, 'i'));
            let unit = '';
            if (unitMatch) {
              unit = unitMatch[1].toLowerCase().replace(/\s+/g, '');
            } else if (expectedUnits && expectedUnits.length > 0) {
              unit = expectedUnits[0];
            }
            console.log(`  ✓ Next-line start number: ${label} = ${value} ${unit}`);
            return { value, unit, quality: 'high' };
          }
        }
      }
      
      // PRIORITY 2: Try to extract from the label line itself
      const lineResult = extractFromWindow(line, escapedLabel, expectedUnits);
      if (lineResult) {
        console.log(`  ✓ Line-level extraction: ${label}`);
        return lineResult;
      }
    }
  }

  // PRIORITY 3: Fall back to 100-character window to handle multi-line values
  // Some reports have test name on one line and value on the next
  const searchWindow = originalText.slice(matchIndex, matchIndex + 100);
  
  // Use shared extraction logic on the 100-character window
  const windowResult = extractFromWindow(searchWindow, escapedLabel, expectedUnits);
  if (windowResult) {
    console.log(`  ✓ Window extraction (100 chars): ${label}`);
    return windowResult;
  }

  return null;
}

/**
 * Extract value from a text window (shared logic for line-level and window extraction)
 */
function extractFromWindow(searchWindow, escapedLabel, expectedUnits) {
  // Common medical units - handle both "/" and " " (OCR often reads "/" as space)
  const validUnitPattern = '(g[/ ]?d[lL]|g[/ ]?[lL]|mg[/ ]?d[lL]|mg[/ ]?[lL]|mgs%|mmol[/ ]?[lL]|pg[/ ]?m[lL]|ng[/ ]?d[lL]|ng[/ ]?m[lL]|ul[/ ]?m[lL]|iu[/ ]?m[lL]|iu[/ ]?[lL]|mill?[/ ]?mm3|thou[/ ]?mm3|cu\\.?mm|fL|fl|pg|%|gm%|gm[/ ]?d[lL]|cells[/ ]?mm3|thọu[/ ]?mm3)';
  
  // Pattern 0: Value BEFORE reference range (common in diabetes reports)
  // Format: "Glucose PP (Plasma)  174 90-140  mg/dL"
  // OR: "Glucose PP (Plasma)  174 90-140  <corrupted-unit>"
  const pattern0 = new RegExp(
    `${escapedLabel}[^0-9]*?([0-9]+\\.?[0-9]*)\\s+[0-9.]+\\s*[-–]\\s*[0-9.]+`,
    'i'
  );
  
  let match = searchWindow.match(pattern0);
  if (match) {
    const value = parseFloat(match[1]);
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      // Try to extract unit from the text after the match
      const afterMatch = searchWindow.slice(match.index + match[0].length);
      const unitMatch = afterMatch.match(new RegExp(`^[^a-zA-Z0-9]*?(${validUnitPattern})`, 'i'));
      
      let unit = '';
      if (unitMatch) {
        unit = unitMatch[1].toLowerCase().replace(/\s+/g, '');
      } else if (expectedUnits && expectedUnits.length > 0) {
        // Use expected unit if no unit found
        unit = expectedUnits[0];
      }
      
      console.log(`  ✓ Pattern 0 (value before range): ${value} ${unit}`);
      return { value, unit, quality: 'high' };
    }
  }
  
  // Pattern 1: Value + Unit (skip ref ranges)
  const pattern1 = new RegExp(
    `${escapedLabel}[^0-9]*?([0-9]+\\.?[0-9]*)\\s+${validUnitPattern}(?!\\s*[-–])`,
    'i'
  );
  
  match = searchWindow.match(pattern1);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'high' };
    }
  }
  
  // Pattern 2: Value before ref range, then unit
  const pattern2 = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)\\s+[0-9.]+\\s*[-–]\\s*[0-9.]+\\s*${validUnitPattern}`,
    'i'
  );
  
  match = searchWindow.match(pattern2);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'high' };
    }
  }
  
  // Pattern 3: Simple value + unit
  const pattern3 = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)\\s+${validUnitPattern}`,
    'i'  
  );
  
  match = searchWindow.match(pattern3);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'medium' };
    }
  }
  
  // Fallback: Value only, use expectedUnits
  const fallbackPattern = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)(?!\\s*[-–]\\s*[0-9])`,
    'i'
  );
  
  match = searchWindow.match(fallbackPattern);
  if (match) {
    const value = parseFloat(match[1]);
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      let unit = (expectedUnits && expectedUnits.length > 0) ? expectedUnits[0] : '';
      return { value, unit, quality: 'low' };
    }
  }

  return null;
}

/**
 * Extract value from a text window (shared logic for line-level and window extraction)
 */
function extractFromWindow(searchWindow, escapedLabel, expectedUnits) {
  // Common medical units - handle both "/" and " " (OCR often reads "/" as space)
  const validUnitPattern = '(g[/ ]?d[lL]|g[/ ]?[lL]|mg[/ ]?d[lL]|mg[/ ]?[lL]|mgs%|mmol[/ ]?[lL]|pg[/ ]?m[lL]|ng[/ ]?d[lL]|ng[/ ]?m[lL]|ul[/ ]?m[lL]|iu[/ ]?m[lL]|iu[/ ]?[lL]|mill?[/ ]?mm3|thou[/ ]?mm3|cu\\.?mm|fL|fl|pg|%|gm%|gm[/ ]?d[lL]|cells[/ ]?mm3|thọu[/ ]?mm3)';
  
  // Pattern 1: Value + Unit (skip ref ranges)
  const pattern1 = new RegExp(
    `${escapedLabel}[^0-9]*?([0-9]+\\.?[0-9]*)\\s+${validUnitPattern}(?!\\s*[-–])`,
    'i'
  );
  
  let match = searchWindow.match(pattern1);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'high' };
    }
  }
  
  // Pattern 2: Value before ref range, then unit
  const pattern2 = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)\\s+[0-9.]+\\s*[-–]\\s*[0-9.]+\\s*${validUnitPattern}`,
    'i'
  );
  
  match = searchWindow.match(pattern2);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'high' };
    }
  }
  
  // Pattern 3: Simple value + unit
  const pattern3 = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)\\s+${validUnitPattern}`,
    'i'  
  );
  
  match = searchWindow.match(pattern3);
  if (match) {
    const value = parseFloat(match[1]);
    let unit = match[2].toLowerCase().replace(/\\s+/g, '');
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      return { value, unit, quality: 'medium' };
    }
  }
  
  // Fallback: Value only, use expectedUnits
  const fallbackPattern = new RegExp(
    `${escapedLabel}[^0-9]+([0-9]+\\.?[0-9]*)(?!\\s*[-–]\\s*[0-9])`,
    'i'
  );
  
  match = searchWindow.match(fallbackPattern);
  if (match) {
    const value = parseFloat(match[1]);
    if (!isNaN(value) && value >= 0 && value < 100000000) {
      let unit = (expectedUnits && expectedUnits.length > 0) ? expectedUnits[0] : '';
      return { value, unit, quality: 'low' };
    }
  }

  return null;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determine parameter status based on value and normal range
 * Supports:
 * - Numeric values with ranges: { min, max }
 * - Categorical/string values: based on value content
 * - Nested ranges: { default: { min, max }, male: { min, max }, female: { min, max } }
 */
function determineStatus(value, normalRange) {
  // CATEGORICAL VALUE HANDLING (for qualitative parameters)
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    
    // Normal/Negative indicators
    const normalIndicators = [
      'negative', 'absent', 'nil', 'normal', 'clear', 
      'colorless', 'colourless', 'non-reactive', 'not detected'
    ];
    
    // Abnormal/Positive indicators
    const abnormalIndicators = [
      'positive', 'present', 'abnormal', 'detected', 'reactive'
    ];
    
    // Borderline/Warning indicators
    const borderlineIndicators = [
      'trace', 'traces', 'few', 'occasional', 'scanty'
    ];
    
    // Check for normal indicators
    if (normalIndicators.some(indicator => lowerValue.includes(indicator))) {
      return 'Normal';
    }
    
    // Check for abnormal indicators
    if (abnormalIndicators.some(indicator => lowerValue.includes(indicator))) {
      return 'Abnormal';
    }
    
    // Check for borderline indicators
    if (borderlineIndicators.some(indicator => lowerValue.includes(indicator))) {
      return 'Borderline';
    }
    
    // Default for other string values (colors, appearances, etc.)
    return 'Normal';
  }
  
  // NUMERIC VALUE HANDLING (for quantitative parameters)
  if (!normalRange || typeof normalRange !== 'object') {
    return 'Normal'; // Default if no range specified
  }

  let rangeToUse = normalRange;

  // Check if normalRange has nested structure (male/female/default)
  if (!normalRange.min && !normalRange.max) {
    // Nested structure detected
    if (normalRange.default) {
      // Use default if available
      rangeToUse = normalRange.default;
    } else {
      // Use first available range object (male, female, or any other key)
      const firstKey = Object.keys(normalRange).find(key => 
        normalRange[key] && typeof normalRange[key] === 'object'
      );
      if (firstKey) {
        rangeToUse = normalRange[firstKey];
      } else {
        return 'Normal'; // No valid range found
      }
    }
  }

  // Safely extract min and max
  const min = rangeToUse.min;
  const max = rangeToUse.max;

  // Validate value is a number
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Normal';
  }

  // Compare with range
  if (typeof min === 'number' && value < min) {
    return 'Low';
  }

  if (typeof max === 'number' && value > max) {
    return 'High';
  }

  return 'Normal';
}

/**
 * Calculate average confidence across all extracted parameters
 */
function calculateAverageConfidence(parameters) {
  if (parameters.length === 0) {
    return 0;
  }

  const totalConfidence = parameters.reduce((sum, param) => {
    return sum + (param.confidence || 0);
  }, 0);

  return totalConfidence / parameters.length;
}

// Export the main function
module.exports = smartMedicalExtractorV2;
