/**
 * Strict Medical Extraction Service
 * 
 * CLEAN extraction with strict validation rules:
 * 1. Only numeric values for numeric parameters
 * 2. Row-based extraction (not word proximity)
 * 3. Parameter type validation
 * 4. Special handling for BLOOD_SUGAR reports
 * 5. No garbage extraction (like "eiog" instead of numbers)
 */

const { getParameterType, isNumericParameter } = require('./parameterTypes');
const { 
  isStrictlyNumeric, 
  validateExtractedValue, 
  filterValidResults,
  validateBloodSugarReport,
  validateLipidReport,
  validateThyroidReport,
  validateCBCReport
} = require('./strictValidator');
const { extractRowBased } = require('./rowBasedExtractor');

/**
 * Normalize OCR value - fix common OCR mistakes
 * @param {string} value - Raw OCR value
 * @returns {string} - Normalized value
 */
function normalizeOcrValue(value) {
  if (!value || typeof value !== 'string') return value;
  
  let normalized = value.trim();
  
  // Remove trailing dots (OCR artifact: "20." → "20")
  normalized = normalized.replace(/\.$/,  '');
  
  // Fix 6.C → 6.0 FIRST (before checking if it's numeric)
  normalized = normalized.replace(/(\d+)\.C/gi, '$1.0');
  
  // Check if value looks numeric (contains digits, dots, and possibly O or l or I)
  const looksNumeric = /^[0-9OIl.\s]+$/.test(normalized);
  
  if (looksNumeric) {
    // Fix common OCR mistakes for numeric values
    normalized = normalized.replace(/O/g, '0');         // O → 0 (letter O to zero)
    normalized = normalized.replace(/l/g, '1');         // l → 1 (lowercase L to one)
    normalized = normalized.replace(/I/g, '1');         // I → 1 (uppercase i to one)
    
    // Remove spaces from numeric values
    normalized = normalized.replace(/\s+/g, '');
  }
  
  return normalized;
}

/**
 * Normalize common OCR spelling mistakes for all parameter types
 * THIS RUNS BEFORE FILTERING to prevent valid parameters from being rejected
 * @param {string} paramName - Parameter name (possibly misspelled from OCR)
 * @returns {string} - Normalized parameter name
 */
function normalizeCommonOcrSpellingMistakes(paramName) {
  if (!paramName || typeof paramName !== 'string') return paramName;
  
  let normalized = paramName.trim();
  
  // Common OCR spelling mistakes (case-insensitive replacements)
  const spellingCorrections = [
    // Cholesterol variations
    { pattern: /cholesteral/gi, replacement: 'Cholesterol' },
    { pattern: /chalestrol/gi, replacement: 'Cholesterol' },
    { pattern: /chalesteral/gi, replacement: 'Cholesterol' },
    { pattern: /cholestrol/gi, replacement: 'Cholesterol' },
    
    // HDL/LDL variations (only if NOT part of a longer word)
    { pattern: /\bhol\b/gi, replacement: 'HDL' },
    { pattern: /\blol\b/gi, replacement: 'LDL' },
    
    // Triglycerides variations
    { pattern: /triglycerids/gi, replacement: 'Triglycerides' },
    { pattern: /triglyce\s*rides/gi, replacement: 'Triglycerides' },
    
    // Glucose variations
    { pattern: /gllcose/gi, replacement: 'Glucose' },
    { pattern: /qiucose/gi, replacement: 'Glucose' },
    { pattern: /qibcose/gi, replacement: 'Glucose' },
    
    // Thyroid parameter OCR errors
    { pattern: /trindothvronine/gi, replacement: 'Triiodothyronine' },
    { pattern: /triodothyronine/gi, replacement: 'Triiodothyronine' },
    { pattern: /triiodothvronine/gi, replacement: 'Triiodothyronine' },
    { pattern: /triindothyronine/gi, replacement: 'Triiodothyronine' },
    { pattern: /thyronine(?!\s)/gi, replacement: 'Thyroxine' }, // "Thyronine" → "Thyroxine" if not followed by space
    { pattern: /\bf\s*1\s*3\b/gi, replacement: 'FT3' },
    { pattern: /\bf\s*1\s*4\b/gi, replacement: 'FT4' }
  ];
  
  // Apply each spelling correction
  for (const { pattern, replacement } of spellingCorrections) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
}

/**
 * Normalize CBC parameter names from OCR variations to standard names
 * @param {string} paramName - Parameter name (possibly misspelled from OCR)
 * @returns {string} - Normalized standard parameter name
 */
function normalizeCbcParameterName(paramName) {
  const normalizations = {
    // Hemoglobin variations
    'Hemeglobin': 'Hemoglobin',
    'Hemeglobrı': 'Hemoglobin',
    'Haemoglobin': 'Hemoglobin',
    
    // MCV variations
    'MCY': 'MCV',
    
    // PCV variations
    'Packed Cell Volume': 'PCV',
    'Packed Cel Vokmę': 'PCV',
    'Packed Cel Volume': 'PCV',
    
    // Total Leukocyte Count variations
    'Total Leukocyte Count': 'TLC',
    'Tptal Leukocyte Count': 'TLC',
    'Total Leukocyte Counı': 'TLC',
    'White Blood Cell Count': 'WBC',
    'WBC Count': 'WBC',
    
    // Neutrophils variations
    'Segmented Neutrophils': 'Neutrophils',
    'Segrnented Neutrophils': 'Neutrophils',
    
    // Lymphocytes variations
    'Lymphotytes': 'Lymphocytes',
    
    // RBC variations
    'Red Blood Cell Count': 'RBC Count',
    
    // Platelet variations
    'Platelet Count': 'Platelets',
    'Platelet Coun': 'Platelets',
    
    // Absolute count variations
    'Neutrophils Absolute': 'Absolute Neutrophils',
    'Abs Neutrophils': 'Absolute Neutrophils',
    'Lymphocytes Absolute': 'Absolute Lymphocytes',
    'Abs Lymphocytes': 'Absolute Lymphocytes',
    'Monocytes Absolute': 'Absolute Monocytes',
    'Abs Monocytes': 'Absolute Monocytes',
    'Eosinophils Absolute': 'Absolute Eosinophils',
    'Abs Eosinophils': 'Absolute Eosinophils',
    'Basophils Absolute': 'Absolute Basophils',
    'Abs Basophils': 'Absolute Basophils'
  };
  
  return normalizations[paramName] || paramName;
}

/**
 * Known parameter names for each report type
 */
const KNOWN_PARAMETERS = {
  BLOOD_SUGAR: [
    'Glucose',
    'Blood Sugar',
    'Blood sugar',
    'Fasting Glucose',
    'Fasting Blood Sugar',
    'Blood sugar (Fasting)',
    'Blood Sugar (Fasting)',
    'Glucose Fasting',
    'Glucose Fasting (Plasma)',  // For "Glucose Fasting (Plasma)" format
    'Post Prandial Glucose',
    'Post Prandial Blood Sugar',
    'Postprandial Glucose',
    'Blood sugar (Post Prandial)',
    'Blood Sugar (Post Prandial)',
    'Glucose PP',
    'Glucose PP (Plasma)',  // For "Glucose PP (Plasma)" format
    'Glucose Post Prandial',
    'Random Glucose',
    'Random Blood Sugar',
    'Blood sugar (Random)',
    'Blood Sugar (Random)',
    'HbA1c',
    'Average Blood Glucose',
    'ABG'
  ],
  
  CBC: [
    'Hemoglobin', 'Haemoglobin', 'Hb', 'Hemeglobin', 'Hemeglobrı',  // OCR variations
    'RBC', 'RBC Count', 'Red Blood Cell Count',
    'WBC', 'WBC Count', 'White Blood Cell Count',
    'TLC', 'Total Leukocyte Count', 'Tptal Leukocyte Count', 'Total Leukocyte Counı',  // OCR variations
    'Platelets', 'Platelet Count', 'Platelet Coun',
    'Hematocrit', 'PCV', 'Packed Cell Volume', 'Packed Cel Vokmę',  // OCR variations
    'MCV', 'MCY',  // OCR variation
    'MCH', 'MCHC', 'RDW', 'MPV',
    'Neutrophils', 'Segmented Neutrophils', 'Segrnented Neutrophils',  // OCR variations
    'Lymphocytes', 'Lymphotytes',  // OCR variation
    'Monocytes', 'Eosinophils', 'Basophils',
    // Absolute counts (from "Absolute Leucocyte Count" section)
    'Absolute Neutrophils', 'Neutrophils Absolute', 'Abs Neutrophils',
    'Absolute Lymphocytes', 'Lymphocytes Absolute', 'Abs Lymphocytes', 
    'Absolute Monocytes', 'Monocytes Absolute', 'Abs Monocytes',
    'Absolute Eosinophils', 'Eosinophils Absolute', 'Abs Eosinophils',
    'Absolute Basophils', 'Basophils Absolute', 'Abs Basophils'
  ],
  
  KIDNEY_FUNCTION: [
    'Creatinine', 'Serum Creatinine',
    'Urea', 'Serum Urea',
    'BUN', 'Blood Urea Nitrogen',
    'Uric Acid', 'Serum Uric Acid',
    'eGFR', 'EGFR', 'GFR',
    'Sodium', 'Serum Sodium',
    'Potassium', 'Serum Potassium',
    'Chloride', 'Serum Chloride',
    'Calcium', 'Serum Calcium'
  ],
  
  LIVER_FUNCTION: [
    'Bilirubin Total', 'Total Bilirubin',
    'Bilirubin Direct', 'Direct Bilirubin',
    'Bilirubin Indirect', 'Indirect Bilirubin',
    'SGOT', 'AST', 'AST (SGOT)',
    'SGPT', 'ALT', 'ALT (SGPT)',
    'AST:ALT Ratio',
    'ALP', 'Alkaline Phosphatase', 'Alkaline Phosphatase (ALP)',
    'Total Protein', 'Albumin', 'Globulin',
    'A/G Ratio', 'A:G Ratio',
    'GGT', 'GGTP'
  ],
  
  LIPID_PROFILE: [
    'Cholesterol', 'Total Cholesterol', 'Cholesterol Total',
    'Chalesteral', 'Total Chalesteral', 'Chalesteral Total',  // Common OCR misspelling
    'Cholestrol', 'Total Cholestrol',  // Another common misspelling
    'HDL', 'HDL Cholesterol', 'HDL Chalesteral',
    'LDL', 'LDL Cholesterol', 'LDL Chalesteral',
    'VLDL', 'VLDL Cholesterol', 'VLDL Chalesteral',
    'Triglycerides', 'Triglyce rides',
    'TC/HDL Ratio', 'LDL/HDL Ratio',
    'Non-HDL Cholesterol', 'Non-HDL Chalesteral', 'Non HDL Cholesterol'
  ],
  
  THYROID: [
    'TSH', 'Thyroid Stimulating Hormone',
    'T3', 'Total T3', 'TT3', 'Triiodothyronine',
    'T4', 'Total T4', 'TT4', 'Thyroxine',
    'Free T3', 'FT3', 'Free Triiodothyronine', 'Free Trindothvronine', 'Free Triodothyronine',
    'Free T4', 'FT4', 'Free Thyroxine', 'Free Thyronine'
  ],
  
  URINE_ROUTINE: [
    // Physical Examination
    'Volume',
    'Colour', 'Color',
    'Appearance',
    // Chemical Examination
    'Ph', 'pH',
    'Specific Gravity',
    'Urine Protein', 'Protein',
    'Urine Glucose', 'Sugar', 'Glucose',
    'Ketone', 'Ketones',
    'Nitrite',
    'Blood',
    'Urobilinogen',
    'Bilirubin',
    'Leukocyte', 'Leukocytes',
    // Microscopic Examination
    'RBC', 'Red Blood Cells',
    'Pus Cells', 'Pus Cell',
    'Epithelial Cells', 'Epithelial Cell',
    'Casts',
    'Crystals',
    'Bacteria',
    'Budding Yeast Cells', 'Budding Yeast',
    'Yeast Cells',
    'Others'
  ],
  
  ELECTROLYTES: [
    'Sodium', 'Na', 'Serum Sodium',
    'Potassium', 'K', 'Serum Potassium',
    'Chloride', 'Cl', 'Serum Chloride',
    'Bicarbonate', 'HCO3', 'Serum Bicarbonate',
    'Calcium', 'Ca', 'Serum Calcium',
    'Magnesium', 'Mg', 'Serum Magnesium',
    'Phosphorus', 'Phosphate', 'Serum Phosphorus'
  ]
};

/**
 * Metadata/header fields that should NEVER be extracted as test parameters
 * These are common report header fields that contain numbers but are not medical test results
 */
const METADATA_FIELDS = [
  'Age', 'Age:', 'Years', 'Year',
  'UHID', 'UHID:', 'Patient ID', 'MR No', 'MRN',
  'Lab No', 'Lab No.', 'LabNo', 'Lab Number',
  'Name', 'Patient Name', 'Patient', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Master',
  'Gender', 'Male', 'Female', 'Sex',
  'Registered on', 'Registered', 'Registration',
  'Collected on', 'Coilected on', 'Collection', 'Sample Collected', 'Received',
  'Reported on', 'Report Date', 'Reported',
  'Generated on', 'Generated', 'Report Generated',
  'Printed on', 'Printed', 'Print Date',
  'Ref. By', 'Ref By', 'Referred By',
  'TAT', 'Sample Type',
  'Page', 'Page No', 'Page Number',
  'Phone', 'Mobile', 'Contact',
  'Dr.', 'Doctor', 'Physician',
  'Report Status', 'Status', 'Final',
  'Interpretation', 'Interpretation:', 'Note', 'Note:', 'Comment', 'Comment:',  // Filter interpretation text
  'Reference', 'Reference Range', 'Normal Range'  // Filter reference range text
];

/**
 * Detect report type from OCR text
 * @param {string} ocrText - Raw OCR text
 * @returns {string} - Report type (BLOOD_SUGAR, CBC, KIDNEY_FUNCTION, etc.)
 */
function detectReportType(ocrText) {
  if (!ocrText) return 'UNKNOWN';
  
  const lowerText = ocrText.toLowerCase();
  
  // Urine Routine detection - check FIRST (more specific than blood sugar)
  // Urine reports may contain "glucose" as a parameter, so check this before BLOOD_SUGAR
  if (/urine\s+(routine|examination|test|r\/e)/i.test(ocrText) ||
      /routine\s+urine/i.test(ocrText) ||
      /urine\s+examination\s+routine/i.test(ocrText)) {
    return 'URINE_ROUTINE';
  }
  
  // Blood Sugar detection
  if (lowerText.includes('glucose') || lowerText.includes('blood sugar') || 
      lowerText.includes('hba1c') || lowerText.includes('diabetic')) {
    return 'BLOOD_SUGAR';
  }
  
  // CBC detection
  if (lowerText.includes('hemoglobin') && lowerText.includes('platelet') ||
      lowerText.includes('complete blood count') || lowerText.includes('cbc')) {
    return 'CBC';
  }
  
  // Electrolytes detection - CHECK BEFORE KFT (more specific)
  if (lowerText.includes('electrolytes') || lowerText.includes('electrolyte panel') ||
      (lowerText.includes('sodium') && lowerText.includes('potassium') && lowerText.includes('chloride'))) {
    return 'ELECTROLYTES';
  }
  
  // Kidney Function detection
  if (lowerText.includes('creatinine') && lowerText.includes('urea') ||
      lowerText.includes('kidney function') || lowerText.includes('kft') ||
      lowerText.includes('renal function') || lowerText.includes('rft')) {
    return 'KIDNEY_FUNCTION';
  }
  
  // Liver Function detection
  if (lowerText.includes('sgot') || lowerText.includes('sgpt') ||
      lowerText.includes('liver function') || lowerText.includes('lft')) {
    return 'LIVER_FUNCTION';
  }
  
  // Lipid Profile detection
  if (lowerText.includes('cholesterol') && lowerText.includes('hdl') ||
      lowerText.includes('lipid profile') || lowerText.includes('lipid panel')) {
    return 'LIPID_PROFILE';
  }
  
  // Thyroid detection
  if (lowerText.includes('tsh') || lowerText.includes('thyroid')) {
    return 'THYROID';
  }
  
  return 'UNKNOWN';
}

/**
 * Detect all report types present in a multi-section OCR text
 * Returns array of {type, startLine, endLine, sectionText}
 */
function detectAllReportSections(ocrText) {
  if (!ocrText) return [];
  
  const sections = [];
  const lines = ocrText.split('\n');
  
  // Section headers to detect (only match explicit headers, not parameter names)
  const sectionPatterns = [
    { type: 'LIVER_FUNCTION', patterns: [/liver\s+function\s+tests?/i] },
    { type: 'LIPID_PROFILE', patterns: [/lipid\s+profile/i, /lipid\s+panel/i] },
    { type: 'THYROID', patterns: [/thyroid\s+function\s+tests?/i, /thyroid.*profile/i] },
    { type: 'CBC', patterns: [/complete\s+blood\s+count/i, /\bcbc\b/i] },
    { type: 'ELECTROLYTES', patterns: [/\belectrolytes?\b/i, /electrolyte\s+panel/i, /electrolyte\s+test/i] },
    { type: 'KIDNEY_FUNCTION', patterns: [/kidney\s+function/i, /renal\s+function/i] },
    { type: 'BLOOD_SUGAR', patterns: [/glucose\s+tests?/i, /blood\s+sugar\s+tests?/i, /diabetic\s+profile/i] },
    { type: 'URINE_ROUTINE', patterns: [/urine\s+routine/i, /routine\s+urine/i] }
  ];
  
  let currentSection = null;
  let currentStartIdx = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line matches any section header
    for (const { type, patterns } of sectionPatterns) {
      const isMatch = patterns.some(pattern => pattern.test(line));
      
      if (isMatch) {
        // Save previous section if exists
        if (currentSection) {
          const sectionText = lines.slice(currentStartIdx, i).join('\n');
          sections.push({
            type: currentSection,
            startLine: currentStartIdx,
            endLine: i - 1,
            sectionText: sectionText
          });
        }
        
        // Start new section
        currentSection = type;
        currentStartIdx = i;
        break;
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    const sectionText = lines.slice(currentStartIdx).join('\n');
    sections.push({
      type: currentSection,
      startLine: currentStartIdx,
      endLine: lines.length - 1,
      sectionText: sectionText
    });
  }
  
  return sections;
}

/**
 * Extract multiple report types from a combined report
 * Returns array of extraction results, one per detected section
 */
function extractMultipleReports(ocrText) {
  console.log('\n🔍 Detecting multiple report sections...');
  
  const sections = detectAllReportSections(ocrText);
  
  if (sections.length === 0) {
    console.log('   ℹ️  No distinct sections detected, treating as single report');
    return [extractWithStrictValidation(ocrText)];
  }
  
  if (sections.length === 1) {
    console.log(`   ℹ️  Single section detected: ${sections[0].type}`);
    return [extractWithStrictValidation(ocrText, sections[0].type)];
  }
  
  console.log(`   ✅ Found ${sections.length} distinct sections:`);
  sections.forEach(section => {
    console.log(`      - ${section.type} (lines ${section.startLine}-${section.endLine})`);
  });
  
  // Extract each section separately
  const results = sections.map(section => {
    console.log(`\n📊 Extracting ${section.type} section...`);
    const result = extractWithStrictValidation(section.sectionText, section.type);
    return {
      ...result,
      sectionInfo: {
        startLine: section.startLine,
        endLine: section.endLine
      }
    };
  });
  
  return results;
}

/**
 * Main extraction function with strict validation
 * @param {string} ocrText - Raw OCR text
 * @param {string} reportType - Optional report type (auto-detected if not provided)
 * @returns {object} - { success, reportType, parameters, rejected }
 */
function extractWithStrictValidation(ocrText, reportType = null) {
  console.log('\n========================================');
  console.log('🔬 STRICT MEDICAL EXTRACTION STARTED');
  console.log('========================================\n');
  
  if (!ocrText || ocrText.trim().length === 0) {
    return {
      success: false,
      reportType: 'UNKNOWN',
      parameters: [],
      rejected: [],
      message: 'Empty OCR text'
    };
  }
  
  // Step 1: Detect report type
  const detectedType = reportType || detectReportType(ocrText);
  console.log(`📋 Report Type: ${detectedType}`);
  
  // Step 2: Get known parameters for this report type
  const knownParameters = KNOWN_PARAMETERS[detectedType] || [];
  console.log(`📝 Known Parameters: ${knownParameters.length}`);
  
  // Step 2.5: Filter out garbage/interpretation lines from OCR text
  const cleanedOcrText = ocrText.split('\n')
    .filter(line => !isGarbageLine(line))
    .join('\n');
  
  // Step 3: Row-based extraction (skip for specialized extractors)
  let rawResults = [];
  
  if (detectedType !== 'URINE_ROUTINE' && 
      detectedType !== 'LIVER_FUNCTION' && 
      detectedType !== 'KFT' && 
      detectedType !== 'KIDNEY_FUNCTION' && 
      detectedType !== 'ELECTROLYTES') {
    rawResults = extractRowBased(cleanedOcrText, knownParameters);
  }
  
  // Step 3.1: For URINE_ROUTINE, use pattern-based extraction with normalization
  if (detectedType === 'URINE_ROUTINE') {
    console.log('\n🔍 Running URINE-specific pattern extraction (with garbage filtering)...');
    const urineResults = extractUrineRoutineWithNormalization(ocrText);
    if (urineResults.length > 0) {
      console.log(`✅ Urine pattern extraction found ${urineResults.length} parameters`);
      rawResults.push(...urineResults);
    }
  }
  
  // Step 3.2: For LIVER_FUNCTION, use LFT-specific extraction with garbage filtering
  if (detectedType === 'LIVER_FUNCTION') {
    console.log('\n🔍 Running LFT-specific pattern extraction (with garbage filtering)...');
    const lftResults = extractLiverFunctionWithNormalization(ocrText);
    if (lftResults.length > 0) {
      console.log(`✅ LFT pattern extraction found ${lftResults.length} parameters`);
      rawResults.push(...lftResults);
    }
  }
  
  // Step 3.5: If report is BLOOD_SUGAR, try specialized extraction methods
  if (detectedType === 'BLOOD_SUGAR') {
    // First try: Structured "Glucose [Type] (Plasma)" format
    console.log('\n🔍 Running Glucose (Plasma) format extraction...');
    const plasmaResults = extractGlucosePlasmaFormat(ocrText);
    if (plasmaResults.length > 0) {
      console.log(`✅ Plasma format extraction found ${plasmaResults.length} parameters`);
      rawResults.push(...plasmaResults);
    }
    
    // Second try: Pattern-based fallback for garbled OCR (e.g., "{Blood sugar{(Fasting)")
    console.log('\n🔍 Running pattern-based fallback for blood sugar (to catch garbled lines)...');
    const patternResults = extractBloodSugarFromGarbledOcr(ocrText);
    if (patternResults.length > 0) {
      console.log(`✅ Pattern-based extraction found ${patternResults.length} additional parameters`);
      rawResults.push(...patternResults);
    }
    
    // Third try: Aggressive numeric pattern extraction for completely garbled parameter names
    console.log('\n🔍 Running aggressive numeric pattern extraction (for garbled parameter names)...');
    const numericPatternResults = extractBloodSugarFromNumericPatterns(ocrText);
    if (numericPatternResults.length > 0) {
      console.log(`✅ Numeric pattern extraction found ${numericPatternResults.length} additional parameters`);
      rawResults.push(...numericPatternResults);
    }
  }
  
  // Step 3.6: If report is LIPID_PROFILE, try specialized extraction for garbled results
  if (detectedType === 'LIPID_PROFILE' || detectedType === 'LIPID') {
    console.log('\n🔍 Running LIPID-specific pattern extraction (for garbled results)...');
    const lipidResults = extractLipidFromPatterns(ocrText);
    if (lipidResults.length > 0) {
      console.log(`✅ Lipid pattern extraction found ${lipidResults.length} parameters`);
      rawResults.push(...lipidResults);
    }
  }
  
  // Step 3.7: If report is THYROID, try specialized extraction for garbled results
  if (detectedType === 'THYROID' || detectedType === 'THYROID_PROFILE') {
    console.log('\n🔍 Running THYROID-specific pattern extraction (for garbled results)...');
    const thyroidResults = extractThyroidFromPatterns(ocrText);
    if (thyroidResults.length > 0) {
      console.log(`✅ Thyroid pattern extraction found ${thyroidResults.length} parameters`);
      rawResults.push(...thyroidResults);
    }
  }
  
  // Step 3.8: If report is CBC, try specialized extraction for table format
  if (detectedType === 'CBC') {
    console.log('\n🔍 Running CBC-specific pattern extraction (for table format)...');
    const cbcResults = extractCBCFromPatterns(ocrText);
    if (cbcResults.length > 0) {
      console.log(`✅ CBC pattern extraction found ${cbcResults.length} parameters`);
      rawResults.push(...cbcResults);
    }
  }
  
  // Step 3.9: If report is KFT/ELECTROLYTES, try specialized extraction for table format with unit fixing
  if (detectedType === 'KFT' || detectedType === 'KIDNEY_FUNCTION' || detectedType === 'ELECTROLYTES') {
    console.log('\n🔍 Running KFT-specific pattern extraction (for table format with unit fixing)...');
    const kftResults = extractKFTFromPatterns(ocrText);
    if (kftResults.length > 0) {
      console.log(`✅ KFT pattern extraction found ${kftResults.length} parameters`);
      rawResults.push(...kftResults);
    }
  }
  
  console.log(`\n🔍 Raw Extraction: ${rawResults.length} results`);
  
  // Step 3.8: Apply common OCR spelling normalization BEFORE filtering
  console.log('\n📝 Normalizing common OCR spelling mistakes...');
  const normalizedResults = rawResults.map(result => ({
    ...result,
    parameter: normalizeCommonOcrSpellingMistakes(result.parameter)
  }));
  
  let spellingFixCount = 0;
  rawResults.forEach((orig, idx) => {
    if (orig.parameter !== normalizedResults[idx].parameter) {
      console.log(`   ✏️  Fixed: "${orig.parameter}" → "${normalizedResults[idx].parameter}"`);
      spellingFixCount++;
    }
  });
  console.log(`✅ Fixed ${spellingFixCount} spelling mistakes`);
  
  // Step 3.9: Filter out metadata/header fields (Age, UHID, etc.)
  console.log('\n🧹 Filtering metadata fields...');
  const filteredResults = normalizedResults.filter(result => {
    const paramName = result.parameter.toLowerCase().trim();
    
    // Check if parameter name matches any metadata field
    const isMetadata = METADATA_FIELDS.some(metaField => {
      const metaLower = metaField.toLowerCase();
      return paramName === metaLower || 
             paramName.startsWith(metaLower) || 
             paramName.includes(metaLower);
    });
    
    if (isMetadata) {
      console.log(`   🗑️  Filtered out metadata: "${result.parameter}" = ${result.value}`);
      return false;
    }
    return true;
  });
  
  console.log(`✅ After metadata filtering: ${filteredResults.length} results (removed ${normalizedResults.length - filteredResults.length} metadata fields)`);
  
  // Step 4: Validate each result
  const validResults = [];
  const rejectedResults = [];
  
  console.log('\n📊 VALIDATION PHASE:\n');
  
  for (const result of filteredResults) {
    const { parameter, value, unit, referenceRange, numericValue } = result;
    
    // Normalize parameter name based on report type
    let normalizedParameter = parameter;
    if (detectedType === 'CBC') {
      normalizedParameter = normalizeCbcParameterName(parameter);
    } else if (detectedType === 'URINE_ROUTINE') {
      normalizedParameter = normalizeUrineParameterName(parameter);
    } else if (detectedType === 'LIVER_FUNCTION') {
      normalizedParameter = normalizeLftParameterName(parameter);
    }
    
    // Get expected type for this parameter
    const expectedType = getParameterType(normalizedParameter);
    
    // Validate the value
    const validation = validateExtractedValue(normalizedParameter, value, expectedType);
    
    if (validation.isValid) {
      const validParam = {
        parameter: normalizedParameter,  // Use normalized name
        value: (detectedType === 'URINE_ROUTINE' || detectedType === 'LIVER_FUNCTION') ? value : validation.cleanValue, // 🔧 Preserve value for URINE and LFT
        unit: unit || '',
        type: expectedType,
        extractionMethod: result.extractionMethod || 'row-based'
      };
      
      // 🔧 FIX #2: Add numericValue for URINE and LFT numeric parameters
      if ((detectedType === 'URINE_ROUTINE' || detectedType === 'LIVER_FUNCTION') && numericValue !== undefined) {
        validParam.numericValue = numericValue;
      }
      
      // Include reference range if present
      if (referenceRange) {
        validParam.referenceRange = referenceRange;
      }
      
      // 🔧 FIX #3 & #5: Evaluate status for URINE_ROUTINE parameters
      if (detectedType === 'URINE_ROUTINE') {
        if (expectedType === 'NUMERIC' && numericValue !== undefined) {
          validParam.status = evaluateNumericStatus(numericValue, referenceRange);
        } else if (expectedType === 'QUALITATIVE') {
          validParam.status = evaluateQualitativeStatus(value, referenceRange);
        } else {
          validParam.status = 'Normal';
        }
      }
      
      // 🔧 FIX #6: Preserve status for LIVER_FUNCTION (already evaluated in extraction)
      if (detectedType === 'LIVER_FUNCTION' && result.status) {
        validParam.status = result.status;
      }
      
      validResults.push(validParam);
      
      // Enhanced logging for URINE and LFT
      if ((detectedType === 'URINE_ROUTINE' || detectedType === 'LIVER_FUNCTION') && validParam.status) {
        console.log(`✅ ${normalizedParameter}: ${value} ${unit || ''} [${expectedType}] - ${validParam.status}`);
      } else {
        console.log(`✅ ${normalizedParameter}: ${validation.cleanValue} ${unit || ''} [${expectedType}]`);
      }
      
      // Show normalization if name was changed
      if (normalizedParameter !== parameter) {
        console.log(`   📝 Normalized: "${parameter}" → "${normalizedParameter}"`);
      }
    } else {
      rejectedResults.push({
        parameter: normalizedParameter,  // Use normalized name
        rejectedValue: value,
        reason: validation.reason
      });
      console.log(`❌ ${normalizedParameter}: "${value}" - ${validation.reason}`);
    }
  }
  
  // Step 5: Special validation for BLOOD_SUGAR and LIPID reports
  let finalResults = validResults;
  if (detectedType === 'BLOOD_SUGAR') {
    console.log('\n🩸 BLOOD_SUGAR SPECIAL VALIDATION:\n');
    finalResults = validateBloodSugarReport(validResults);
  } else if (detectedType === 'LIPID_PROFILE' || detectedType === 'LIPID') {
    console.log('\n💊 LIPID SPECIAL VALIDATION:\n');
    finalResults = validateLipidReport(validResults);
  } else if (detectedType === 'THYROID' || detectedType === 'THYROID_PROFILE') {
    console.log('\n🦋 THYROID SPECIAL VALIDATION:\n');
    finalResults = validateThyroidReport(validResults);
  } else if (detectedType === 'CBC') {
    console.log('\n🩸 CBC SPECIAL VALIDATION:\n');
    finalResults = validateCBCReport(validResults);
  }
  
  // Step 5.1: For LIPID reports, check for suspicious reference-value-only extractions
  if (detectedType === 'LIPID_PROFILE' || detectedType === 'LIPID') {
    console.log('\n🔍 REFERENCE VALUE CHECK:\n');
    const commonReferenceValues = [200, 150, 40, 100, 30, 130, 125, 35, 160, 240];
    let suspiciousCount = 0;
    
    for (const param of finalResults) {
      const value = parseFloat(param.value);
      if (!isNaN(value)) {
        const isReference = commonReferenceValues.some(ref => Math.abs(value - ref) < 0.1);
        if (isReference) {
          suspiciousCount++;
          console.log(`⚠️  ${param.parameter}: ${value} matches common reference value`);
        } else {
          console.log(`✅ ${param.parameter}: ${value} appears to be a result value`);
        }
      }
    }
    
    // If ALL extracted values are reference values, likely OCR column misalignment
    if (finalResults.length > 0 && suspiciousCount === finalResults.length) {
      console.log('\n❌ WARNING: All extracted values match common reference boundaries!');
      console.log('   This suggests OCR captured REFERENCE column instead of RESULT column.');
      console.log('   Marking report for manual entry.\n');
      
      return {
        success: false,
        reportType: detectedType,
        parameters: [],
        rejected: rejectedResults,
        requiresManualReview: true,
        requiresManualEntry: true,
        message: 'OCR quality issue: Unable to extract actual result values. Please enter values manually.'
      };
    }
    
    // If MORE THAN HALF are reference values, warn but don't reject
    if (finalResults.length > 1 && suspiciousCount > finalResults.length / 2) {
      console.log('\n⚠️  WARNING: Multiple values match reference boundaries.');
      console.log('   This may indicate OCR column misalignment.');
      console.log('   Consider manual verification.\n');
    }
  } else if (detectedType === 'ELECTROLYTES') {
    console.log('\n⚡ ELECTROLYTES SPECIAL VALIDATION:\n');
    
    // Step 5.2: Check for suspicious reference-value-only extractions for electrolytes
    console.log('\n🔍 REFERENCE VALUE CHECK:\n');
    const commonReferenceValues = [
      // Sodium (mEq/L)
      136, 145, 135, 146,
      // Potassium (mEq/L)
      3.5, 5.0, 5.1, 3.6, 5.2,
      // Chloride (mEq/L)
      98, 107, 96, 106, 100, 108,
      // Bicarbonate (mEq/L)
      22, 28, 23, 29, 24, 30,
      // Calcium (mg/dL)
      8.6, 10.2, 8.5, 10.0, 10.5,
      // Magnesium (mg/dL)
      1.8, 2.3, 1.7, 2.5
    ];
    let suspiciousCount = 0;
    
    for (const param of finalResults) {
      const value = parseFloat(param.value);
      if (!isNaN(value)) {
        const isReference = commonReferenceValues.some(ref => Math.abs(value - ref) < 0.15);
        if (isReference) {
          suspiciousCount++;
          console.log(`⚠️  ${param.parameter}: ${value} matches common reference value`);
        } else {
          console.log(`✅ ${param.parameter}: ${value} appears to be a result value`);
        }
      }
    }
    
    // NOTE: Many healthy patients have values at or near reference boundaries
    // Don't reject - just warn if ALL values match boundaries
    if (finalResults.length > 0 && suspiciousCount === finalResults.length) {
      console.log('\n⚠️  NOTE: All extracted values are at reference boundaries.');
      console.log('   This could indicate OCR column misalignment, OR normal patient results.');
      console.log('   Allowing extraction - user can verify in the app.\n');
      // Don't return error - let the values through
    }
    
    // If MORE THAN HALF are reference values, warn but don't reject
    if (finalResults.length > 1 && suspiciousCount > finalResults.length / 2) {
      console.log('\n⚠️  NOTE: Multiple values match reference boundaries.');
      console.log('   This may indicate OCR column misalignment.');
      console.log('   User should verify values in the app.\n');
    }
  }
  
  // Safety check: If >30% of parameters were rejected, flag for manual review
  const totalAttempted = validResults.length + rejectedResults.length;
  const rejectionRate = totalAttempted > 0 ? rejectedResults.length / totalAttempted : 0;
  const requiresManualReview = rejectionRate > 0.3;
  
  if (requiresManualReview) {
    console.log('\n⚠️  WARNING: High rejection rate detected!');
    console.log(`   ${Math.round(rejectionRate * 100)}% of parameters were rejected`);
    console.log('   This report may require manual review.\n');
  }
  
  // ============================================
  // REFINED MANUAL ENTRY LOGIC (per new business rules)
  // ============================================
  
  // Check if OCR text contains numeric values (indicates extractable data exists)
  const hasNumericValues = /\d+\.?\d*/.test(ocrText);
  
  // Determine if manual entry is truly required
  let requiresManualEntry = false;
  let analysisComplete = true;
  let message = '';
  let success = finalResults.length > 0;
  
  if (finalResults.length === 0) {
    // Case 1: No parameters extracted
    if (detectedType === 'UNKNOWN' && !hasNumericValues) {
      // No report type detected AND no numeric values → MANUAL ENTRY REQUIRED
      requiresManualEntry = true;
      analysisComplete = false;
      success = false;
      message = 'No valid medical parameters found in OCR text';
    } else if (detectedType !== 'UNKNOWN' && rejectedResults.length > 0) {
      // Report type detected, extraction attempted, but all values rejected → MANUAL ENTRY REQUIRED
      requiresManualEntry = true;
      analysisComplete = false;
      success = false;
      message = `All extracted values were rejected due to validation. ${rejectedResults.length} values out of range. Manual entry required.`;
    } else if (detectedType !== 'UNKNOWN') {
      // Report type detected but no parameters found in OCR → MANUAL ENTRY REQUIRED
      requiresManualEntry = true;
      analysisComplete = false;
      success = false;
      message = 'Report type detected but no valid parameters extracted. Manual entry required.';
    } else {
      // Has numeric values but unknown type → Manual review needed
      requiresManualEntry = true;
      analysisComplete = false;
      success = false;
      message = 'Unable to determine report type. Please verify manually.';
    }
  } else {
    // Case 2: Some parameters extracted successfully
    success = true;
    analysisComplete = true;
    requiresManualEntry = false;
    message = `Successfully extracted ${finalResults.length} parameters`;
  }
  
  // Summary
  console.log('\n========================================')
  console.log('✅ EXTRACTION COMPLETE');
  console.log('========================================');
  console.log(`📊 Valid Parameters: ${finalResults.length}`);
  console.log(`❌ Rejected: ${rejectedResults.length}`);
  console.log(`📋 Report Type: ${detectedType}`);
  console.log(`🎯 Analysis Complete: ${analysisComplete}`);
  console.log(`✋ Requires Manual Entry: ${requiresManualEntry}`);
  console.log('========================================\n');
  
  return {
    success: success,
    reportType: detectedType,
    parameters: finalResults,
    rejected: rejectedResults,
    requiresManualReview: requiresManualReview,
    requiresManualEntry: requiresManualEntry,
    analysisComplete: analysisComplete,
    message: message
  };
}

/**
 * Extract Glucose Fasting/PP from structured "Glucose [Type] (Plasma)" format
 * Specifically handles OCR issues where digits get separated or merged with ranges
 * Example: "Glucose PP (Plasma) 1 0-140" where value should be "174" not "1"
 */
function extractGlucosePlasmaFormat(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Skip interpretation lines completely
    if (/interpretation|indicates|reading|more than|less than|can indicate/i.test(line)) {
      console.log(`   ⏩ Skipping interpretation line: ${line.substring(0, 60)}...`);
      continue;
    }
    
    // Pattern: "Glucose [Fasting|PP] (Plasma) [value] [range] [unit]"
    const plasmaMatch = line.match(/glucose\s+(fasting|pp)\s*\(plasma\)\s+(.+)/i);
    
    if (plasmaMatch) {
      const type = plasmaMatch[1].toLowerCase();
      const restOfLine = plasmaMatch[2].trim();
      
      // Split the rest by spaces
      const tokens = restOfLine.split(/\s+/);
      
      // Extract value - look for first numeric token that's not part of a range
      let value = null;
      let unit = 'mg/dL';
      
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];
        
        // Skip if it's a range pattern (e.g., "60-110", "0-140")
        if (/^\d+-\d+$/.test(token)) continue;
        
        // Check if it's a numeric value (including decimals)
        if (/^\d+\.?\d*$/.test(token)) {
          const numValue = parseFloat(token);
          
          // For postprandial (PP), typical range is 90-200
          // For fasting, typical range is 70-126
          // Single digit values (1-9) are suspicious - likely OCR errors
          if (type === 'pp') {
            // If we see a single digit or small 2-digit number, likely OCR split the value
            if (numValue < 50) {
              console.log(`   ⚠️  Suspicious PP value: ${numValue} (too low, likely OCR error)`);
              // Don't extract - let it be marked for manual entry
              value = null;
            } else if (numValue >= 80 && numValue <= 400) {
              value = numValue;
            }
          } else if (type === 'fasting') {
            // Fasting glucose: reasonable range 50-200
            if (numValue >= 50 && numValue <= 200) {
              value = numValue;
            } else if (numValue < 50) {
              console.log(`   ⚠️  Suspicious Fasting value: ${numValue} (too low, likely OCR error)`);
              value = null;
            }
          }
          
          if (value) break;
        }
        
        // Check for unit
        if (/^mg/i.test(token)) {
          unit = 'mg/dL';
        }
      }
      
      // Only add if we found a valid value
      if (value) {
        const parameterName = type === 'fasting' ? 'Fasting Glucose' : 'Postprandial Glucose';
        results.push({
          parameter: parameterName,
          value: value.toString(),
          unit: unit,
          extractionMethod: 'glucose-plasma-format'
        });
        console.log(`   🎯 Found ${parameterName}: ${value} ${unit} (Plasma format)`);
      } else {
        console.log(`   ⚠️  Skipping line due to suspicious/missing value: ${line}`);
      }
    }
  }
  
  return results;
}

/**
 * Extract lipid profile values using pattern matching
 * Handles the common pattern: "Parameter [Result] [</>] [Reference] Unit"
 * Example: "HDL Cholesterol 45 > 40.00 mg/dL" or "Total Cholesterol 180 < 200 mg/dL"
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
function extractLipidFromPatterns(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Known lipid parameters (ordered: check VLDL before LDL to avoid false matches)
  const lipidParameters = [
    { pattern: /cholesterol\s+total|total\s+cholesterol/i, name: 'Total Cholesterol' },
    { pattern: /triglyceride/i, name: 'Triglycerides' },
    { pattern: /hdl\s+cholesterol/i, name: 'HDL Cholesterol' },
    { pattern: /vldl\s+cholesterol/i, name: 'VLDL Cholesterol' },
    { pattern: /\bldl\s+cholesterol/i, name: 'LDL Cholesterol' },  // \b = word boundary to avoid matching VLDL
    { pattern: /non-hdl\s+cholesterol|non\s+hdl/i, name: 'Non-HDL Cholesterol' }
  ];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Skip interpretation or header lines
    if (/investigation|result|reference|value|unit|sample\s+type|tat:/i.test(line)) {
      continue;
    }
    
    // Check each lipid parameter
    for (const { pattern, name } of lipidParameters) {
      if (pattern.test(lineLower)) {
        // Try to find pattern: [numeric] [</>] [numeric] [unit]
        // Examples:
        // "HDL Cholesterol NT J > 40.00 mg/dL"  → Result: ?, Ref: > 40.00
        // "LDL Cholesterol 0 oie, < 100.00 mg/dL" → Result: 0, Ref: < 100.00
        // "Total Cholesterol 180 < 200.00 mg/dL" → Result: 180, Ref: < 200

        // Pattern 1: Result [Operator] Reference Unit
        // Match: "0 oie, < 100.00 mg/dL" or "180 < 200 mg/dL"
        const pattern1 = /(\d+\.?\d*)\s+[^<>]*\s*([<>≤≥])\s*(\d+\.?\d*)\s*(mg\/d[lL]|mmol\/[lL])/i;
        const match1 = line.match(pattern1);
        
        if (match1) {
          const result = match1[1];
          const operator = match1[2];
          const reference = match1[3];
          const unit = match1[4];
          
          const resultNum = parseFloat(result);
          const refNum = parseFloat(reference);
          
          // Improved sanity check: Skip only if result equals reference (likely OCR duplicate)
          // Don't skip valid high/low results that happen to match common ranges
          if (resultNum === refNum) {
            console.log(`   ⏩ Skipping "${name}": ${result} equals reference ${reference} (likely OCR error)`);
            continue;
          }
          
          results.push({
            parameter: name,
            value: result,
            unit: unit,
            referenceRange: `${operator}${reference}`,
            extractionMethod: 'lipid-pattern-1'
          });
          
          console.log(`   🎯 Found ${name}: ${result} ${unit} (ref: ${operator}${reference})`);
          break; // Found this parameter, move to next line
        }
        
        // Pattern 2: Just find any numeric value before the comparison operator
        // This catches cases where result is garbled but we can still identify the structure
        const pattern2 = /(\d+\.?\d*)\s*([<>≤≥])\s*(\d+\.?\d*)/i;
        const match2 = line.match(pattern2);
        
        if (match2) {
          const firstNum = match2[1];
          const operator = match2[2];
          const secondNum = match2[3];
          
          // Skip if first number equals second (likely OCR duplicate)
          if (parseFloat(firstNum) === parseFloat(secondNum)) {
            console.log(`   ⏩ Skipping "${name}": ${firstNum} equals ${secondNum} (likely OCR error)`);
            continue;
          }
          
          // Extract unit separately
          const unitMatch = line.match(/mg\/d[lL]|mmol\/[lL]/i);
          const unit = unitMatch ? unitMatch[0] : 'mg/dL';
          
          results.push({
            parameter: name,
            value: firstNum,
            unit: unit,
            referenceRange: `${operator}${secondNum}`,
            extractionMethod: 'lipid-pattern-2'
          });
          
          console.log(`   🎯 Found ${name}: ${firstNum} ${unit} (ref: ${operator}${secondNum})`);
          break;
        }
      }
    }
  }
  
  return results;
}

/**
 * Extract thyroid profile values using pattern matching
 * Handles the pattern: "TRIODOTHYRONINE ( 73) 84 ng/dL 35-193 ng/dL"
 * where garbage characters appear between parameter name and value
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
function extractThyroidFromPatterns(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Known thyroid parameters with patterns
  const thyroidParameters = [
    { 
      pattern: /triiodothyronine|triodothyronine|\bt3\b/i, 
      name: 'T3',
      expectedUnit: 'ng/dL',
      unitPattern: /ng\/d[lL]/i
    },
    { 
      pattern: /thyroxine|\bt4\b/i, 
      name: 'T4',
      expectedUnit: 'ug/dL',
      unitPattern: /[mpu]cg\/d[lL]|[pu]g\/d[lL]|ug'dl/i  // mcg/dL, ug/dL, pg/dL (pg/dL is OCR error)
    },
    { 
      pattern: /thyroid\s+stimulating\s+hormone|\btsh\b/i, 
      name: 'TSH',
      expectedUnit: 'uIU/mL',
      unitPattern: /u[il]u\/m[lL]|miu\/l|mu\/l|plu\/ml/i  // Added plu/mL (OCR error for μIU/mL)
    }
  ];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Skip interpretation, method, or header lines
    if (/method|cmia|note|variation|circadian|minimum|influence|interpretation/i.test(line)) {
      continue;
    }
    
    // Check each thyroid parameter
    for (const { pattern, name, expectedUnit, unitPattern } of thyroidParameters) {
      if (pattern.test(lineLower)) {
        // Pattern: "T3, TOTAL, SERUM 217.40 High 80.00 - 200.00 ng/dL"
        // Extract: value=217.40, unit=ng/dL, refRange=80.00-200.00
        
        // Remove status words (High, Low, Normal) to avoid confusion
        let cleanLine = line.replace(/\b(high|low|normal)\b/gi, ' ');
        
        // Find the unit in the line
        const unitMatch = cleanLine.match(unitPattern);
        if (!unitMatch) {
          console.log(`   ⏩ "${name}": Unit not found in line`);
          continue;
        }
        
        const unit = unitMatch[0];
        
        // Strategy: The value is the first substantial number after the parameter name,
        // before the reference range pattern or unit
        let value = null;
        let refMin = null;
        let refMax = null;
        
        // Find position of unit in clean line
        const unitPos = cleanLine.toLowerCase().indexOf(unit.toLowerCase());
        const beforeUnit = cleanLine.substring(0, unitPos);
        
        // Look for reference range pattern (e.g., "80.00 - 200.00") 
        const refRangeMatch = beforeUnit.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        
        let beforeRefRange;
        if (refRangeMatch) {
          // Reference range found before unit
          refMin = refRangeMatch[1];
          refMax = refRangeMatch[2];
          // Get text before the reference range
          beforeRefRange = beforeUnit.substring(0, refRangeMatch.index);
        } else {
          // No reference range before unit, use full text before unit
          beforeRefRange = beforeUnit;
        }
        
        // Extract the last number in the text before the reference range
        // This should be the actual value
        const beforeRefNumbers = beforeRefRange.match(/\d+\.?\d*/g);
        if (beforeRefNumbers && beforeRefNumbers.length > 0) {
          // Take the last number as the value (skip parameter numbers like "3" in "T3")
          value = beforeRefNumbers[beforeRefNumbers.length - 1];
        }
        
        if (!value) {
          console.log(`   ⏩ "${name}": No value found before reference range`);
          continue;
        }
        
        // Validate the value is in reasonable range for this parameter
        const numValue = parseFloat(value);
        let isValid = false;
        
        if (name === 'T3' && numValue >= 20 && numValue <= 500) {
          isValid = true;
        } else if (name === 'T4' && numValue >= 1 && numValue <= 20) {
          isValid = true;
        } else if (name === 'TSH' && numValue >= 0.01 && numValue <= 100) {
          isValid = true;
        }
        
        if (!isValid) {
          console.log(`   ⏩ "${name}": Value ${numValue} out of reasonable range`);
          continue;
        }
        
        // Fix T4 unit if it's pg/dL or mcg/dL (OCR variants - should be ug/dL)
        let correctedUnit = unit;
        if (name === 'T4' && (unit.toLowerCase().includes('pg') || unit.toLowerCase().includes('mcg'))) {
          correctedUnit = 'ug/dL';
          console.log(`   🔧 Corrected ${name} unit: "${unit}" → "ug/dL"`);
        }
        
        // Fix TSH unit if it's mU/L or plu/mL (should be uIU/mL)
        if (name === 'TSH' && (unit.toLowerCase() === 'mu/l' || unit.toLowerCase() === 'plu/ml')) {
          correctedUnit = 'uIU/mL';
          console.log(`   🔧 Corrected ${name} unit: "${unit}" → "uIU/mL"`);
        }
        
        results.push({
          parameter: name,
          value: value,
          unit: correctedUnit,
          referenceRange: refMin && refMax ? `${refMin}-${refMax}` : null,
          extractionMethod: 'thyroid-pattern'
        });
        
        console.log(`   🎯 Found ${name}: ${value} ${correctedUnit}${refMin && refMax ? ` (ref: ${refMin}-${refMax})` : ''}`);
        break; // Found this parameter, move to next line
      }
    }
  }
  
  return results;
}

/**
 * Extract CBC values from table format
 * Handles various patterns including:
 * - Table format: "Parameter Value RefMin - RefMax Unit"
 * - Prevents concatenation errors like "Neutrophils 50 40 - 80 %" becoming "5040%"
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
function extractCBCFromPatterns(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Known CBC parameters with expected ranges and units
  const cbcParameters = [
    { 
      patterns: [/hemoglobin|haemoglobin|hgb|hb(?![a-z])/i], 
      name: 'Hemoglobin',
      expectedUnit: 'g/dL',
      unitPatterns: /g\/d[lL]|gm\/dl|gm%/i
    },
    { 
      patterns: [/platelets?|plt(?![a-z])/i], 
      name: 'Platelets',
      expectedUnit: '/cumm',
      unitPatterns: /\/cumm|cumm|lakhs?\/cumm|x\s*10\^3\/ul/i
    },
    { 
      patterns: [/\bwbc\b|white\s+blood\s+cells?|leucocytes?/i], 
      name: 'WBC',
      expectedUnit: '/cumm',
      unitPatterns: /\/cumm|cumm|cells?\/cumm|x\s*10\^3\/ul/i
    },
    { 
      patterns: [/\brbc\b|red\s+blood\s+cells?|erythrocytes?/i], 
      name: 'RBC',
      expectedUnit: 'million/cumm',
      unitPatterns: /million\/cumm|mill?\/cumm|x\s*10\^6\/ul/i
    },
    { 
      patterns: [/neutrophils?/i], 
      name: 'Neutrophils',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    { 
      patterns: [/lymphocytes?/i], 
      name: 'Lymphocytes',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    { 
      patterns: [/monocytes?/i], 
      name: 'Monocytes',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    { 
      patterns: [/eosinophils?/i], 
      name: 'Eosinophils',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    { 
      patterns: [/basophils?/i], 
      name: 'Basophils',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    {
      patterns: [/hematocrit|haematocrit|pcv|packed\s+cell\s+volume/i],
      name: 'Hematocrit',
      expectedUnit: '%',
      unitPatterns: /%|percent/i
    },
    {
      patterns: [/mcv|mean\s+corpuscular\s+volume/i],
      name: 'MCV',
      expectedUnit: 'fL',
      unitPatterns: /f[lL]|femtol/i
    },
    {
      patterns: [/mch(?![a-z])|mean\s+corpuscular\s+hemoglobin(?!\s+concentration)/i],
      name: 'MCH',
      expectedUnit: 'pg',
      unitPatterns: /pg|picog/i
    },
    {
      patterns: [/mchc|mean\s+corpuscular\s+hemoglobin\s+concentration/i],
      name: 'MCHC',
      expectedUnit: 'g/dL',
      unitPatterns: /g\/d[lL]|gm\/dl/i
    }
  ];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Skip interpretation, method, or header lines
    if (/method|interpretation|note|sample|collected|patient|report/i.test(line)) {
      continue;
    }
    
    // Check each CBC parameter
    for (const { patterns, name, expectedUnit, unitPatterns } of cbcParameters) {
      // Check if any pattern matches
      const matchesPattern = patterns.some(pattern => pattern.test(lineLower));
      
      if (matchesPattern) {
        // Pattern: "Neutrophils 50 40 - 80 %"
        // We need to extract: value=50 (NOT 5040), refMin=40, refMax=80, unit=%
        
        // Strategy: Look for sequences of numbers separated by spaces
        // First number (after parameter name) = value
        // If followed by 2 numbers with dash = reference range
        // Last word matching unit pattern = unit
        
        // Remove the parameter name from the line
        let workingLine = line;
        for (const pattern of patterns) {
          workingLine = workingLine.replace(pattern, '').trim();
        }
        
        // Extract all numbers from the line
        const numbers = workingLine.match(/\d+\.?\d*/g);
        if (!numbers || numbers.length < 1) {
          console.log(`   ⏩ "${name}": No numeric values found in line`);
          continue;
        }
        
        // Find the unit in the line
        const unitMatch = workingLine.match(unitPatterns);
        const unit = unitMatch ? unitMatch[0] : expectedUnit;
        
        // Strategy:
        // If we have 3+ numbers, assume: value refMin refMax
        // If we have 1 number, assume: value
        let value = null;
        let refMin = null;
        let refMax = null;
        
        if (numbers.length >= 3) {
          // Pattern: "50 40 - 80" or "50 40 80"
          value = numbers[0];
          refMin = numbers[1];
          refMax = numbers[2];
        } else if (numbers.length === 1) {
          // Only value, no reference range
          value = numbers[0];
        } else if (numbers.length === 2) {
          // Could be "value refMin" or "value refMax" - assume value only
          value = numbers[0];
        }
        
        if (!value) {
          console.log(`   ⏩ "${name}": Could not determine value`);
          continue;
        }
        
        // Validate the value is in reasonable range for this parameter
        const numValue = parseFloat(value);
        let isValid = false;
        
        if (name === 'Hemoglobin' && numValue >= 3 && numValue <= 25) {
          isValid = true;
        } else if (name === 'Platelets' && numValue >= 10 && numValue <= 1000) {
          isValid = true;
        } else if (name === 'WBC' && numValue >= 500 && numValue <= 100000) {
          isValid = true;
        } else if (name === 'RBC' && numValue >= 1 && numValue <= 10) {
          isValid = true;
        } else if (['Neutrophils', 'Lymphocytes', 'Monocytes', 'Eosinophils', 'Basophils', 'Hematocrit'].includes(name) && numValue >= 0 && numValue <= 100) {
          isValid = true;
        } else if (name === 'MCV' && numValue >= 50 && numValue <= 150) {
          isValid = true;
        } else if (name === 'MCH' && numValue >= 15 && numValue <= 50) {
          isValid = true;
        } else if (name === 'MCHC' && numValue >= 20 && numValue <= 40) {
          isValid = true;
        }
        
        if (!isValid) {
          console.log(`   ⏩ "${name}": Value ${numValue} out of reasonable range`);
          continue;
        }
        
        results.push({
          parameter: name,
          value: value,
          unit: unit,
          referenceRange: refMin && refMax ? `${refMin}-${refMax}` : null,
          extractionMethod: 'cbc-pattern'
        });
        
        console.log(`   🎯 Found ${name}: ${value} ${unit}${refMin && refMax ? ` (ref: ${refMin}-${refMax})` : ''}`);
        break; // Found this parameter, move to next line
      }
    }
  }
  
  return results;
}

/**
 * Extract KFT/Electrolyte values from table format with unit fixing
 * Handles:
 * - Unit OCR errors: "mg dl" → "mg/dL", "gdb" → "g/dL", "UL" → "U/L", "mmol l" → "mmol/L"
 * - Missing units for PHOSPHORUS
 * - A'G RATIO (OCR reads "/" as "'")
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
/**
 * Correct OCR decimal point errors for electrolyte values
 * Common error: "1450.00" should be "145.00" (decimal moved)
 * @param {number} value - The extracted numeric value
 * @param {Array<number>} range - [minRange, maxRange]
 * @returns {number} - Corrected value
 */
function correctOcrDecimalError(value, range) {
  const [minRange, maxRange] = range;
  
  // If value is already in range, no correction needed
  if (value >= minRange && value <= maxRange) {
    return value;
  }
  
  // Try dividing by 10 if value is 10x too large
  const dividedBy10 = value / 10;
  if (dividedBy10 >= minRange && dividedBy10 <= maxRange) {
    console.log(`   🔧 OCR decimal correction: ${value} → ${dividedBy10} (÷10)`);
    return dividedBy10;
  }
  
  // Try dividing by 100 if value is 100x too large
  const dividedBy100 = value / 100;
  if (dividedBy100 >= minRange && dividedBy100 <= maxRange) {
    console.log(`   🔧 OCR decimal correction: ${value} → ${dividedBy100} (÷100)`);
    return dividedBy100;
  }
  
  // Try multiplying by 10 if value is 10x too small
  const multipliedBy10 = value * 10;
  if (multipliedBy10 >= minRange && multipliedBy10 <= maxRange) {
    console.log(`   🔧 OCR decimal correction: ${value} → ${multipliedBy10} (×10)`);
    return multipliedBy10;
  }
  
  // No correction found, return original
  return value;
}

function extractKFTFromPatterns(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Known KFT/Electrolyte parameters with expected ranges
  const kftParameters = [
    { patterns: [/\burea\b/i], name: 'UREA', expectedUnit: 'mg/dL', range: [5, 50] },
    { patterns: [/\bcreatinine\b/i], name: 'Creatinine', expectedUnit: 'mg/dL', range: [0.4, 2.0] },
    { patterns: [/uric\s+acid/i], name: 'Uric Acid', expectedUnit: 'mg/dL', range: [2, 10] },
    { patterns: [/total\s+protein/i], name: 'Total Protein', expectedUnit: 'g/dL', range: [5, 9] },
    { patterns: [/\balbumin\b/i], name: 'Albumin', expectedUnit: 'g/dL', range: [3, 6] },
    { patterns: [/\bglobulin\b/i], name: 'Globulin', expectedUnit: 'g/dL', range: [2, 5] },
    { patterns: [/a['\\/:]g\s*ratio/i], name: 'A/G Ratio', expectedUnit: '', range: [0.5, 3] }, // Unitless
    { patterns: [/alkaline\s+phosphatase/i, /\balp\b/i], name: 'Alkaline Phosphatase', expectedUnit: 'U/L', range: [20, 300] },
    { patterns: [/\bcalcium\b/i], name: 'Calcium', expectedUnit: 'mg/dL', range: [5, 150] }, // Wide range for OCR decimal errors (8.8 → 88)
    { patterns: [/\bphosphorus\b/i, /\bphosphate\b/i], name: 'Phosphorus', expectedUnit: 'mg/dL', range: [2, 6] },
    { patterns: [/\bsodium\b/i, /\bna\b/i], name: 'Sodium', expectedUnit: 'mmol/L', range: [130, 150] },
    { patterns: [/\bpotassium\b/i, /\bk\b/i], name: 'Potassium', expectedUnit: 'mmol/L', range: [3, 6] },
    { patterns: [/\bchloride\b/i, /\bcl\b/i], name: 'Chloride', expectedUnit: 'mmol/L', range: [90, 115] },
    { patterns: [/\bbicarbonate\b/i, /\bhco3\b/i], name: 'Bicarbonate', expectedUnit: 'mEq/L', range: [20, 32] },
    { patterns: [/\bmagnesium\b/i, /\bmg\b/i], name: 'Magnesium', expectedUnit: 'mg/dL', range: [1.5, 2.5] }
  ];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Skip interpretation, method, or header lines
    if (/method|interpretation|note|sample|collected|patient|report|investigation|observed|value|unit|biological|ref|interval|specimen/i.test(line)) {
      continue;
    }
    
    // Check each KFT parameter
    for (const { patterns, name, expectedUnit, range } of kftParameters) {
      // Check if any pattern matches
      const matchesPattern = patterns.some(pattern => pattern.test(lineLower));
      
      if (matchesPattern) {
        // Pattern: "UREA 8.4 mg dl 128-428 Serum" or "PHOSPHORUS 3.8" or "A'G RATIO 1.21 1-2 Serum"
        // Extract: value, unit (with OCR error fixing), refRange
        
        // Remove the parameter name from the line
        let workingLine = line;
        for (const pattern of patterns) {
          workingLine = workingLine.replace(pattern, '').trim();
        }
        
        // Extract all numbers and potential units
        // 🔧 FIX: Look for the FIRST valid numeric value in the line, not just at the start
        // This handles OCR garbage like "Sodium SLT 3 sertlenick 136.00 - 145.00"
        // where "SLT 3 sertlenick" is garbage and "136.00" is actually the reference range
        
        // Find all numbers in the line
        const allNumbers = workingLine.match(/(\d+\.?\d*)/g);
        if (!allNumbers || allNumbers.length === 0) {
          console.log(`   ⏩ "${name}": No value found in line`);
          continue;
        }
        
        // Try to find the actual test value by checking if it's in the valid range
        let value = null;
        let valueIndex = -1;
        const [minRange, maxRange] = range;
        
        for (let i = 0; i < allNumbers.length; i++) {
          let numValue = parseFloat(allNumbers[i]);
          numValue = correctOcrDecimalError(numValue, range);
          
          // Check if this number is in the valid range (likely the test value)
          if (numValue >= minRange && numValue <= maxRange) {
            value = allNumbers[i];
            valueIndex = i;
            break;
          }
        }
        
        if (!value) {
          console.log(`   ⏩ "${name}": No valid value found in range (${minRange}-${maxRange}). Found: ${allNumbers.join(', ')}`);
          continue;
        }
        
        let numValue = parseFloat(value);
        numValue = correctOcrDecimalError(numValue, range);
        
        // Extract unit (after the value, before reference range)
        // Pattern: "8.4 mg dl 128-428" → unit is "mg dl"
        // Pattern: "SLT 3 sertlenick 136.00 - 145.00 mEq/L" → unit is "mEq/L"
        // Find position of the test value in the workingLine
        const valuePosition = workingLine.indexOf(value);
        const afterValue = workingLine.substring(valuePosition + value.length).trim();
        
        let unit = '';
        let refMin = null;
        let refMax = null;
        
        // Try to find unit before reference range
        const unitMatch = afterValue.match(/^([a-zA-Z\/\s\(\):]+?)(?:\s+\d+|$)/);
        if (unitMatch) {
          unit = unitMatch[1].trim();
        }
        
        // Fix common OCR errors in units
        unit = unit.replace(/mg\s+dl/i, 'mg/dL')      // "mg dl" → "mg/dL"
                   .replace(/mg-dl/i, 'mg/dL')         // "mg-dl" → "mg/dL"
                   .replace(/mg\)[:\s]*d?l?/i, 'mg/dL') // "mg)" or "mg): dl" → "mg/dL" (OCR error)
                   .replace(/gdb|gdL/i, 'g/dL')         // "gdb" or "gdL" → "g/dL"
                   .replace(/^UL$/i, 'U/L')             // "UL" → "U/L"
                   .replace(/mmol\s+l/i, 'mmol/L')      // "mmol l" → "mmol/L"
                   .replace(/mmol\s*\|/i, 'mmol/L')     // "mmol |" → "mmol/L" (OCR error)
                   .replace(/meq\s*\/?\s*l/i, 'mEq/L')  // "meq/l", "meq l" → "mEq/L"
                   .replace(/mEq\s+l/i, 'mEq/L');       // "mEq l" → "mEq/L"
        
        // If unit is still empty or invalid, use expected unit
        if (!unit || unit.length > 15 || /serum|plasma|blood/i.test(unit)) {
          unit = expectedUnit;
        }
        
        // Extract reference range
        const refMatch = afterValue.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (refMatch) {
          refMin = refMatch[1];
          refMax = refMatch[2];
        }
        
        results.push({
          parameter: name,
          value: numValue.toString(), // Use corrected value
          unit: unit,
          referenceRange: refMin && refMax ? `${refMin}-${refMax}` : null,
          extractionMethod: 'kft-pattern'
        });
        
        console.log(`   🎯 Found ${name}: ${numValue} ${unit || '(unitless)'}${refMin && refMax ? ` (ref: ${refMin}-${refMax})` : ''}`);
        break; // Found this parameter, move to next line
      }
    }
  }
  
  return results;
}

/**
 * Extract blood sugar values from garbled or unusual OCR text
 * Handles various patterns including:
 * - Multi-line: "Blood sugar" on one line, value on next line
 * - Same-line: "{Blood sugar{(Fasting) 138 mg/dl"
 * - Same-line: "Blood sugar (Post Prandial) 254 mg/dl"
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
function extractBloodSugarFromGarbledOcr(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Pre-filter: Remove interpretation lines from OCR text to avoid false matches
  const cleanedLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return !/interpretation|indicates|reading|more than|less than|can indicate/i.test(lower);
  });
  const cleanedOcrText = cleanedLines.join('\n');
  
  // Pattern 1: Same-line extraction with flexible matching
  // Matches: "{Blood sugar{(Fasting) 138 mg/dl" or "Blood sugar (Post Prandial) 254 mg/dl 80 - 140"
  // Enhanced to capture full parameter name, value, unit, and reference range
  // Accept various dash types (-, –, —) that appear in OCR
  const samLinePattern = /[{\[]?\s*blood\s+sugar\s*[{\[]?\s*\(([^)]+)\)\s+(\d+\.?\d*)\s*(mg\/dl|mg\/d|g\/dl|mmol\/l)?(?:\s+[)\]]*\s*(\d+)\s*[-–—]\s*(\d+))?/gi;
  
  let match;
  while ((match = samLinePattern.exec(cleanedOcrText)) !== null) {
    const context = match[1] ? match[1].toLowerCase().trim() : '';
    const value = match[2];
    const unit = match[3] || 'mg/dl';
    const refMin = match[4];
    const refMax = match[5];
    
    // Validate the value is in reasonable range
    const numValue = parseFloat(value);
    if (numValue < 30 || numValue > 500) {
      console.log(`   ⏩ Skipping unrealistic blood sugar value: ${value}`);
      continue;
    }
    
    // Determine parameter name based on context
    let parameterName = 'Fasting Glucose';
    
    if (/post|pp|prandial|after/.test(context)) {
      parameterName = 'Postprandial Glucose';  // Match normalizer standard (no space)
    } else if (/random|rbs/.test(context)) {
      parameterName = 'Random Glucose';
    } else if (/fasting|fbs|before/.test(context)) {
      parameterName = 'Fasting Glucose';
    }
    
    const result = {
      parameter: parameterName,
      value: value,
      unit: unit,
      extractionMethod: 'pattern-based-same-line'
    };
    
    // Add reference range if found
    if (refMin && refMax) {
      result.referenceRange = `${refMin}-${refMax}`;
    }
    
    results.push(result);
    
    const refInfo = refMin && refMax ? ` [ref: ${refMin}-${refMax}]` : '';
    console.log(`   🎯 Found (same-line) ${parameterName}: ${value} ${unit}${refInfo}`);
  }
  
  // Pattern 2: Multi-line extraction (original logic)
  // Line with "blood/sugar" followed by line with number
  for (let i = 0; i < cleanedLines.length - 1; i++) {
    const currentLine = cleanedLines[i].trim();
    const currentLineLower = currentLine.toLowerCase();
    const nextLine = cleanedLines[i + 1].trim();
    
    // Check if current line contains "blood" or "sugar" (even if garbled)
    if (/blood|sugar|glucose/.test(currentLineLower)) {
      // Check if next line starts with a number
      const valueMatch = nextLine.match(/^(\d+\.?\d*)\s+(mg\/dl|mg\/d|g\/dl|mmol\/l)?/i);
      
      if (valueMatch) {
        const value = valueMatch[1];
        const unit = valueMatch[2] || 'mg/dl';
        
        // Validate the value is in reasonable range
        const numValue = parseFloat(value);
        if (numValue < 30 || numValue > 500) {
          console.log(`   ⏩ Skipping unrealistic blood sugar value: ${value}`);
          continue;
        }
        
        // Determine parameter name based on context
        let parameterName = 'Fasting Blood Sugar';
        
        if (/post|pp|prandial/.test(currentLineLower)) {
          parameterName = 'Postprandial Glucose';  // Match normalizer standard
        } else if (/random|rbs/.test(currentLineLower)) {
          parameterName = 'Random Glucose';
        } else if (/fasting|fbs/.test(currentLineLower)) {
          parameterName = 'Fasting Glucose';
        }
        
        results.push({
          parameter: parameterName,
          value: value,
          unit: unit,
          extractionMethod: 'pattern-based-multi-line'
        });
        
        console.log(`   🎯 Found (multi-line) ${parameterName}: ${value} ${unit}`);
      }
    }
  }
  
  return results;
}

/**
 * Extract blood sugar values from lines with garbled parameter names
 * Looks for numeric patterns with reference ranges typical for blood sugar tests
 * 
 * This is an aggressive extractor that catches cases like:
 * "mpd RICOD8GE ting) 138 mg/d] 70-110" (garbled "Fasting Glucose")
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results
 */
function extractBloodSugarFromNumericPatterns(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  
  // Track which values we've already extracted to avoid duplicates
  const extractedValues = new Set();
  
  // Look for lines under "BIO-CHEMISTRY" section
  let inBioChemSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Track if we're in the bio-chemistry section
    if (/bio[-\s]?chemistry/i.test(line)) {
      inBioChemSection = true;
      console.log('   📍 Found BIO-CHEMISTRY section');
      continue;
    }
    
    // End of bio-chemistry section
    if (inBioChemSection && (/^[A-Z\s-]{10,}$/.test(line) || /^={3,}/.test(line) || /end of report/i.test(line))) {
      inBioChemSection = false;
      console.log('   📍 Exiting BIO-CHEMISTRY section');
    }
    
    // Skip if line already has "blood sugar" or "glucose" - handled by other extractors
    if (/blood\s+sugar|glucose/i.test(line)) {
      continue;
    }
    
    // Skip interpretation lines
    if (/interpretation|indicates|reading|more than|less than|can indicate/i.test(line)) {
      continue;
    }
    
    // Pattern: Look for lines with:
    // - A numeric value (50-500 range typical for blood sugar)
    // - Followed by unit (mg/dl, mg/d)
    // - Followed by reference range (e.g., "70-110", "80-140")
    // Accept | (pipe), ), ], or spaces as separators
    const numericPattern = /(\d{2,3})\s*(mg\/d[l]?|g\/dl)\s*[)\]|]*\s*(\d+)\s*[-–—]\s*(\d+)/i;
    const match = line.match(numericPattern);
    
    if (match && inBioChemSection) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const refMin = parseInt(match[3]);
      const refMax = parseInt(match[4]);
      
      // Validate: value and reference range should be in typical blood sugar range
      if (value >= 50 && value <= 500 && refMin >= 20 && refMax >= 100 && refMax <= 200) {
        // Avoid duplicate extractions
        if (extractedValues.has(value)) {
          console.log(`   ⏩ Skipping duplicate value: ${value}`);
          continue;
        }
        
        // Determine if it's fasting or postprandial based on reference range and value
        let parameterName = 'Fasting Glucose';
        let matchType = 'unknown';
        
        // Fasting glucose typically has ref range 70-110 or 70-100
        // Postprandial typically has ref range 80-140 or similar
        if (refMax <= 110) {
          parameterName = 'Fasting Glucose';
          matchType = 'fasting (ref max ≤ 110)';
        } else if (refMax >= 130) {
          parameterName = 'Postprandial Glucose';
          matchType = 'postprandial (ref max ≥ 130)';
        } else {
          // Ambiguous - check the value itself
          // Fasting typically < 126, postprandial can be higher
          if (value < 126) {
            parameterName = 'Fasting Glucose';
            matchType = 'fasting (value < 126)';
          } else {
            parameterName = 'Postprandial Glucose';
            matchType = 'postprandial (value ≥ 126)';
          }
        }
        
        results.push({
          parameter: parameterName,
          value: value.toString(),
          unit: unit.toLowerCase(),
          referenceRange: `${refMin}-${refMax}`,
          extractionMethod: 'numeric-pattern-aggressive'
        });
        
        extractedValues.add(value);
        console.log(`   🎯 Found (numeric pattern) ${parameterName}: ${value} ${unit} [ref: ${refMin}-${refMax}] (${matchType})`);
      }
    }
  }
  
  return results;
}

/**
 * Check if a line is garbage (patient info, headers, interpretation text, etc.)
 * @param {string} line - Line to check
 * @returns {boolean} - True if garbage
 */
function isGarbageLine(line) {
  if (!line || line.trim().length === 0) return true;
  
  const lowerLine = line.toLowerCase();
  
  // Reject lines containing patient/header keywords (using word boundaries)
  const garbageKeywords = [
    '\\bmrs\\b', '\\bmr\\b', '\\bmiss\\b', '\\bdr\\b',
    '\\bage\\b', '\\bgender\\b', '\\bsex\\b',
    '\\bpatient\\b', '\\bname\\b',
    '\\bspecimen\\b', '\\breceived\\b', '\\bcollection\\b',
    'referred by', '\\breport\\b',
    '\\blaboratory\\b', '\\blab\\b',
    '\\bdate\\b', '\\btime\\b',
    '\\bbarcode\\b', '\\bid\\b',
    '\\binterpretation\\b',  // Filter interpretation lines
    '\\bnote\\b',            // Filter note lines  
    '\\bcomment\\b',          // Filter comment lines
    'more than',              // Common in interpretation text
    'less than',              // Common in interpretation text
    'indicates',              // Common in interpretation text
    'can indicate',           // Common in interpretation text
  ];
  
  for (const keyword of garbageKeywords) {
    // Use regex with word boundary for single words, direct match for phrases
    if (keyword.includes(' ')) {
      if (lowerLine.includes(keyword)) {
        return true;
      }
    } else {
      const regex = new RegExp(keyword, 'i');
      if (regex.test(lowerLine)) {
        return true;
      }
    }
  }
  
  // Reject lines with excessive special characters (>40%)
  const specialCharCount = (line.match(/[^a-zA-Z0-9\s.+-]/g) || []).length;
  const ratio = specialCharCount / line.length;
  if (ratio > 0.4) {
    return true;
  }
  
  return false;
}

/**
 * Normalize urine parameter names
 * @param {string} paramName - Parameter name
 * @returns {string} - Normalized name
 */
function normalizeUrineParameterName(paramName) {
  const normalizations = {
    'Ph': 'pH',
    'Color': 'Colour',
    'Leukocytes': 'Leukocyte',
    'Ketones': 'Ketone',
    'Protein': 'Urine Protein',
    'Sugar': 'Urine Glucose',
    'Glucose': 'Urine Glucose',
    'Pus Cell': 'Pus Cells',
    'Epithelial Cell': 'Epithelial Cells',
    'Red Blood Cells': 'RBC',
    'Budding Yeast': 'Budding Yeast Cells',
    'Yeast Cells': 'Budding Yeast Cells'
  };
  
  return normalizations[paramName] || paramName;
}

/**
 * Parse urine value preserving numeric precision
 * Prevents column bleed by limiting qualitative words
 * 
 * @param {string} rawValue - Raw value from extraction
 * @returns {object} - { value: string, numericValue?: number, unit?: string }
 */
function parseUrineValue(rawValue) {
  const parts = rawValue.trim().split(/\s+/);

  if (!parts.length) return { value: "", referenceRange: "" };

  const first = parts[0].toUpperCase();

  // QUALITATIVE VALUE
  if (/^(NEGATIVE|POSITIVE|TRACE|NORMAL|ABNORMAL|NIL|\+{1,4}|CLEAR|TURBID|CLOUDY|YELLOW|AMBER|STRAW|RED|BROWN|ORANGE|SLIGHTLY|PALE)$/i.test(first)) {

    let value = first;

    // Optional second word (for PALE YELLOW, SLIGHTLY TURBID)
    if (
      parts.length > 1 &&
      /^(YELLOW|AMBER|STRAW|CLEAR|TURBID|CLOUDY|RED|BROWN|ORANGE|DARK|LIGHT)$/i.test(parts[1])
    ) {
      value += " " + parts[1].toUpperCase();
    }

    // 🔴 Everything AFTER value is reference column
    const referenceStartIndex = value.split(" ").length;
    const referenceParts = parts.slice(referenceStartIndex);

    let referenceRange = "";

    if (referenceParts.length > 0) {
      referenceRange = referenceParts[0].toUpperCase(); // Only take first word
    }

    return { value, referenceRange };
  }

  return { value: rawValue.trim(), referenceRange: "" };


  // Handle numeric values (preserve precision)
  if (/^[0-9OIl.C\-]+/.test(parts[0])) {
    const normalized = normalizeOcrValue(parts[0]);
    
    // 🔧 FIX #2: Store as STRING to preserve precision (1.020 not 1.02)
    const value = normalized;  // Keep as string: "1.020"
    const numericValue = isNaN(parseFloat(normalized)) ? undefined : parseFloat(normalized);
    
    // Check for unit
    let unit = '';
    if (parts.length > 1 && /^(ml|g\/dl|mg\/dl|\/hpf|cells\/hpf)$/i.test(parts[1])) {
      unit = parts[1];
    }
    
    return { value, numericValue, unit };
  }
  
  // Handle ranges (e.g., "3-5" for microscopic counts)
  if (/^\d+\-\d+$/.test(parts[0])) {
    return { value: parts[0] };
  }
  
  // Unknown format, uppercase first word
  return { value: parts[0].toUpperCase() };
}

/**
 * Evaluate qualitative status against reference
 * Used for URINE_ROUTINE qualitative parameters
 * 
 * @param {string} value - Extracted value
 * @param {string} reference - Reference range
 * @returns {string} - "Normal" | "Abnormal"
 */
function evaluateQualitativeStatus(value, reference) {
  if (!reference) return "Normal";
  
  const upperValue = value.toUpperCase().trim();
  const upperRef = reference.toUpperCase().trim();
  
  // 🔧 FIX #3: Proper abnormal detection for qualitative values
  
  // If reference is NEGATIVE or NIL, anything else is abnormal
  if (upperRef === 'NEGATIVE' || upperRef === 'NIL') {
    return (upperValue === 'NEGATIVE' || upperValue === 'NIL') ? "Normal" : "Abnormal";
  }
  
  // If reference is NORMAL, anything else is abnormal
  if (upperRef === 'NORMAL') {
    return upperValue === 'NORMAL' ? "Normal" : "Abnormal";
  }
  
  // For color/appearance references ("CLEAR", "YELLOW", "PALE YELLOW"), exact or partial match = normal
  if (upperValue === upperRef) {
    return "Normal";
  }
  
  // Partial match might be acceptable (e.g., "PALE YELLOW" contains "YELLOW")
  if (upperValue.includes(upperRef) || upperRef.includes(upperValue)) {
    return "Normal";
  }
  
  return "Abnormal";
}

/**
 * Evaluate numeric status against reference range
 * Used for URINE_ROUTINE numeric parameters
 * 
 * @param {number} numericValue - Numeric value
 * @param {string} referenceRange - Reference range (e.g., "4.6-8.0")
 * @returns {string} - "Normal" | "Low" | "High"
 */
function evaluateNumericStatus(numericValue, referenceRange) {
  if (!referenceRange || numericValue === undefined) return "Normal";
  
  // Parse reference range (e.g., "4.6-8.0" or "1.005-1.030")
  const rangeMatch = referenceRange.match(/^([0-9.]+)\-([0-9.]+)$/);
  if (!rangeMatch) return "Normal";
  
  const min = parseFloat(rangeMatch[1]);
  const max = parseFloat(rangeMatch[2]);
  
  if (isNaN(min) || isNaN(max)) return "Normal";
  
  // 🔧 FIX #5: Proper range evaluation
  if (numericValue < min) return "Low";
  if (numericValue > max) return "High";
  
  return "Normal";
}

/**
 * Extract urine routine values with column-aware parsing
 * Fixes column bleed, preserves precision, extracts microscopic section
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results with precision preserved
 */
function extractUrineRoutineWithNormalization(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  const extractedParams = new Set(); // Track normalized parameter names to avoid duplicates
  
  // Strict whitelist for urine parameters (including microscopic)
  const allowedParameters = [
    // Physical Examination
    'Volume', 'Colour', 'Color', 'Appearance',
    // Chemical Examination
    'pH', 'Ph', 'Specific Gravity',
    'Urine Protein', 'Protein',
    'Urine Glucose', 'Sugar', 'Glucose',
    'Ketone', 'Ketones',
    'Nitrite', 'Blood',
    'Urobilinogen', 'Bilirubin',
    'Leukocyte', 'Leukocytes',
    // Microscopic Examination
    'RBC', 'Red Blood Cells',
    'Pus Cells', 'Pus Cell',
    'Epithelial Cells', 'Epithelial Cell',
    'Casts', 'Crystals', 'Bacteria',
    'Budding Yeast Cells', 'Budding Yeast',
    'Yeast Cells', 'Others'
  ];
  
  // OCR misspelling corrections
  const misspellingMap = {
    'BIirubin': 'Bilirubin',
    'Leukocyle': 'Leukocyte',
    'Leukocyles': 'Leukocytes',
    'NItrite': 'Nitrite'
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip garbage lines
    if (isGarbageLine(line)) {
      continue;
    }
    
    // Fix common OCR misspellings in the line
    let correctedLine = line;
    for (const [misspelled, correct] of Object.entries(misspellingMap)) {
      const regex = new RegExp(`\\b${misspelled}\\b`, 'gi');
      correctedLine = correctedLine.replace(regex, correct);
    }
    
    // Try to match each allowed parameter
    for (const paramName of allowedParameters) {
      // Create flexible pattern that handles trailing punctuation
      // Match: "Urine Protein." or "Urine Glucose-" or "Urine Protein:" (even with no value on same line)
      const paramPattern = paramName.replace(/\s+/g, '\\s+');
      const pattern = new RegExp(
        `\\b${paramPattern}\\b[.:\\-]*\\s*(.*)`,  // Allow zero characters after parameter
        'i'
      );
      
      const match = correctedLine.match(pattern);
      if (!match) continue;
      
      // 🔧 FIX #1: Column-aware extraction
      // Split by 2+ spaces to detect columns (Parameter | Value | Reference)
      // This prevents column bleed (e.g., "YELLOW  PALE YELLOW" → value="YELLOW", ref="PALE YELLOW")
      const afterParam = match[1];
      const columns = afterParam.split(/\s{2,}/); // Split by 2+ consecutive spaces
      
      let rawValue = columns[0] ? columns[0].trim() : '';
      let referenceRange = columns[1] ? columns[1].trim() : '';
      
      // Clean reference range to remove method names
      // "NEGATIVE Oxidase Peroxıdase Reacton" → "NEGATIVE"
      // "PALE YELLOW Some Method" → "PALE YELLOW"
      if (referenceRange) {
        // Take only the first 1-2 words for qualitative references
        const refParts = referenceRange.split(/\s+/);
        if (/^(negative|positive|normal|abnormal|nil|clear|yellow|amber|pale|straw)$/i.test(refParts[0])) {
          referenceRange = refParts[0];
          // Add second word if it's also a color/appearance descriptor
          if (refParts.length > 1 && /^(yellow|pale|amber|clear|turbid|dark|light)$/i.test(refParts[1])) {
            referenceRange += ' ' + refParts[1];
          }
        }
        // For numeric ranges (e.g., "4.6-8.0 Method"), keep only the range
        else if (refParts[0] && /^[0-9.]+\-[0-9.]+$/.test(refParts[0])) {
          referenceRange = refParts[0];
        }
      }
      
      // If no value on current line (or only garbage), check next line
      const looksLikeGarbage = rawValue && !rawValue.match(/^(\+{1,4}|NEGATIV?E?|POSITIV?E?|TRACE|NORMAL|ABNORMAL|NIL|[0-9]|YELLOW|CLEAR|TURBID|AMBER|STRAW|PALE|SLIGHTLY|RED|BROWN|ORANGE)/i);
      
      if (!rawValue || rawValue.length < 1 || looksLikeGarbage) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // Only use next line if it's not garbage and starts with a valid value pattern
          if (!isGarbageLine(nextLine) && 
              (nextLine.match(/^(\+{1,4}|NEGATIVE|POSITIVE|TRACE|NORMAL|NIL|[0-9])/) || 
               nextLine.match(/^(YELLOW|CLEAR|TURBID|AMBER|STRAW)/i))) {
            // Next line might also have columns
            const nextColumns = nextLine.split(/\s{2,}/);
            rawValue = nextColumns[0] ? nextColumns[0].trim() : '';
            if (nextColumns[1]) {
              referenceRange = nextColumns[1].trim();
              
              // Clean reference range from next line too
              const refParts = referenceRange.split(/\s+/);
              if (/^(negative|positive|normal|abnormal|nil|clear|yellow|amber|pale|straw)$/i.test(refParts[0])) {
                referenceRange = refParts[0];
                if (refParts.length > 1 && /^(yellow|pale|amber|clear|turbid|dark|light)$/i.test(refParts[1])) {
                  referenceRange += ' ' + refParts[1];
                }
              }
              else if (refParts[0] && /^[0-9.]+\-[0-9.]+$/.test(refParts[0])) {
                referenceRange = refParts[0];
              }
            }
          }
        }
      }
      
      if (!rawValue || rawValue.length < 1) continue;
      
      // Normalize parameter name FIRST
      const normalizedParam = normalizeUrineParameterName(paramName);
      
      // Skip if we already have this parameter (prevents duplicates like Ph and pH)
      if (extractedParams.has(normalizedParam)) {
        console.log(`   ⏭️  Skipping duplicate: ${paramName} → ${normalizedParam}`);
        continue;
      }
      
      // 🔧 FIX #2: Parse value with precision preservation
      const valueResult = parseUrineValue(rawValue);
      
      if (!valueResult.value || valueResult.value.length === 0) continue;
      
      // Mark this parameter as extracted
      extractedParams.add(normalizedParam);
      
      results.push({
        parameter: normalizedParam,
        value: valueResult.value,           // String (preserves precision: "1.020")
        numericValue: valueResult.numericValue, // Optional number
        unit: valueResult.unit || '',
        referenceRange: referenceRange || undefined,
        extractionMethod: 'urine-column-aware-extraction'
      });
      
      // Break after finding match for this parameter to avoid duplicate extraction
      break;
    }
  }
  
  return results;
}

/**
 * Check if line is garbage for LFT (patient demographics, header, footer, notes)
 * @param {string} line - Text line to check
 * @returns {boolean} - True if line is garbage
 */
function isLftGarbageLine(line) {
  if (!line || line.trim().length === 0) return true;
  
  const lowerLine = line.toLowerCase().trim();
  
  // Strict garbage keywords for LFT reports (patient info, header, footer)
  const garbageKeywords = [
    'patient', 'name', 'age', 'sex', 'male', 'female', 'gender',
    'date of birth', 'dob', 'birth', 'address', 'phone', 'mobile',
    'registered', 'collected', 'reported', 'sample collected',
    'specimen', 'barcode', 'lab number', 'reference', 'ref. by',
    'doctor', 'dr.', 'pathology', 'laboratory', 'lab', 'diagnostic',
    'toll free', 'email', 'website', 'www.', '.com', 'accurate', 'caring',
    'complex', 'healthcare', 'road', 'mumbai', 'delhi', 'bangalore',
    'sample type', 'serum', 'plasma', 'blood', 'primary sample',
    'investigation\\s+result', 'test name', 'report', 'page', 'note:',
    'signature', 'authorized', 'accredited'
  ];
  
  for (const keyword of garbageKeywords) {
    if (lowerLine.includes(keyword)) {
      return true;
    }
  }
  
  // Reject lines that are just PID: or Ref: or similar
  if (/^(pid|ref|id|sl\.?no)[:.\s]*\d+/i.test(line)) {
    return true;
  }
  
  // Reject lines with excessive special characters (>40%)
  const specialCharCount = (line.match(/[^a-zA-Z0-9\s.+():/\-]/g) || []).length;
  const ratio = specialCharCount / line.length;
  if (ratio > 0.4) {
    return true;
  }
  
  return false;
}

/**
 * Normalize LFT parameter names
 * @param {string} paramName - Parameter name
 * @returns {string} - Normalized name
 */
function normalizeLftParameterName(paramName) {
  const normalizations = {
    // AST variations
    'AST': 'AST (SGOT)',
    'SGOT': 'AST (SGOT)',
    'ss (scom)': 'AST (SGOT)',
    'ss': 'AST (SGOT)',
    'scom': 'AST (SGOT)',
    // ALT variations
    'ALT': 'ALT (SGPT)',
    'SGPT': 'ALT (SGPT)',
    'ao er)': 'ALT (SGPT)',
    'ao': 'ALT (SGPT)',
    'aer': 'ALT (SGPT)',
    // AST:ALT Ratio variations
    'ATALT Ratio': 'AST:ALT Ratio',
    // ALP variations
    'ALP': 'Alkaline Phosphatase (ALP)',
    'Alkaline Phosphatase': 'Alkaline Phosphatase (ALP)',
    // A:G Ratio variations
    'A/G Ratio': 'A:G Ratio',
    'A/GRatio': 'A:G Ratio',
    'A:GRatio': 'A:G Ratio',
    'AGRatio': 'A:G Ratio',
    '*eaRato': 'A:G Ratio',
    // GGT variations
    'GGT': 'GGTP',
    'jens': 'GGTP',
    // Bilirubin Total variations
    'Bilirubin': 'Bilirubin Total',
    'BlIrubin Total': 'Bilirubin Total',
    'Blirubln Total': 'Bilirubin Total',
    'BJlirubln Total': 'Bilirubin Total',
    'Blasi Tots': 'Bilirubin Total',
    // Bilirubin Direct variations
    'BlIrubin Direct': 'Bilirubin Direct',
    'Blirubln Direct': 'Bilirubin Direct',
    'BJlirubln Direct': 'Bilirubin Direct',
    'Blasi Direct': 'Bilirubin Direct',
    // Bilirubin Indirect variations
    'BlIrubin Indirect': 'Bilirubin Indirect',
    'Bilirubln Indirect': 'Bilirubin Indirect',
    'Bilirubln lndlrect': 'Bilirubin Indirect',
    'Blab Indirect': 'Bilirubin Indirect',
    'Bllirubln': 'Bilirubin Total',
    // Total Protein variations
    'Tora Protein': 'Total Protein'
  };
  
  return normalizations[paramName] || paramName;
}

/**
 * Parse LFT value with column detection
 * Separates value from reference range and status indicators
 * 
 * @param {string} rawValue - Raw value from extraction
 * @returns {object} - { value: number, unit?: string, referenceRange?: string, status?: string }
 */
function parseLftValue(rawValue) {
  let trimmed = rawValue.trim();
  
  if (!trimmed) return { value: null };
  
  // Remove any leading parenthetical alias (e.g., "(ALT)", "(AST)")
  // This handles formats like "SGPT (ALT) 14 U/L" where we extract "(ALT) 14 U/L"
  trimmed = trimmed.replace(/^\([^)]+\)\s*/, '');
  
  // Extract the numeric value (first number encountered)
  const valueMatch = trimmed.match(/^([0-9]+\.?[0-9]*)/);
  
  if (!valueMatch) {
    return { value: null };
  }
  
  let numericValue = parseFloat(valueMatch[1]);
  
  // Handle OCR errors with leading zeros: "010" → "0.10", "020" → "0.20"
  // Pattern: 0XX where XX are 2-3 digits and result would be > 10
  if (valueMatch[1].length >= 3 && valueMatch[1].startsWith('0') && !valueMatch[1].includes('.') && numericValue >= 10) {
    // Convert "010" to "0.10", "020" to "0.20", etc.
    const withDecimal = '0.' + valueMatch[1].substring(1);
    numericValue = parseFloat(withDecimal);
    console.log(`   📝 OCR Fix: "${valueMatch[1]}" → "${withDecimal}" (${numericValue})`);
  }
  
  if (isNaN(numericValue)) {
    return { value: null };
  }
  
  const result = { value: numericValue };
  
  // Remove the value from the beginning to process the rest
  let remaining = trimmed.substring(valueMatch[0].length).trim();
  
  // Check for status indicators at the beginning of remaining text
  const statusMatch = remaining.match(/^(High|Low|Normal)\b/i);
  if (statusMatch) {
    const status = statusMatch[1].toUpperCase();
    result.status = status === 'HIGH' ? 'High' : (status === 'LOW' ? 'Low' : 'Normal');
    remaining = remaining.substring(statusMatch[0].length).trim();
  }
  
  // Extract reference range (pattern: number-number or <number or >number)
  // Handle OCR errors: 030 → 0.30, 4A.BD → 4.80, 2.0D → 2.00
  // Handle spacing: "5.70 -8.20" or "30.00-120.00"
  let rangeMatch = remaining.match(/([0-9]+\.?[0-9]*)\s*([\-–])\s*([0-9]+\.?[0-9]*[A-Z]*)/);
  
  if (rangeMatch) {
    let min = rangeMatch[1];
    let max = rangeMatch[3];
    
    // Fix OCR errors in range values
    // 030 → 0.30 (leading zero without decimal point)
    if (min.length === 3 && min.startsWith('0') && !min.includes('.')) {
      min = '0.' + min.substring(1);
    }
    
    // Fix OCR errors in max value (4A.BD → 4.80, 2.0D → 2.00)
    max = max.replace(/[A-Z]+$/i, match => {
      if (match === 'DD' || match === 'D') return '0';
      if (match === 'BD') return '80';
      return '';
    });
    
    result.referenceRange = min + '-' + max;
    remaining = remaining.substring(rangeMatch.index + rangeMatch[0].length).trim();
  } else {
    // Check for < or > patterns
    rangeMatch = remaining.match(/([<>]\s*[0-9]+\.?[0-9]*)/);
    if (rangeMatch) {
      result.referenceRange = rangeMatch[1].replace(/\s+/g, '');
      remaining = remaining.substring(rangeMatch.index + rangeMatch[0].length).trim();
    }
  }
  
  // Extract unit (letters possibly with slash)
  const unitMatch = remaining.match(/\b([a-zA-Z\/]+)\b/);
  if (unitMatch && unitMatch[1] !== 'HIGH' && unitMatch[1] !== 'LOW' && unitMatch[1] !== 'NORMAL') {
    result.unit = unitMatch[1].toUpperCase();
  }
  
  return result;
}

/**
 * Validate if LFT value is within realistic physiological range
 * Rejects extreme values that are clearly OCR errors
 * 
 * @param {string} parameterName - Normalized parameter name
 * @param {number} value - Numeric value
 * @returns {object} - { isValid: boolean, reason?: string }
 */
function isRealisticLftValue(parameterName, value) {
  // Define realistic ranges for LFT parameters (wider than normal ranges to catch abnormal but valid values)
  const realisticRanges = {
    'AST (SGOT)': { min: 1, max: 1000 },           // Normal: 15-40, but can go very high in liver damage
    'ALT (SGPT)': { min: 1, max: 1000 },           // Normal: 7-56, but can go very high in liver damage
    'AST:ALT Ratio': { min: 0.1, max: 10 },        // Normal: 0.8-2.0
    'GGTP': { min: 0, max: 500 },                  // Normal: 0-50
    'Alkaline Phosphatase (ALP)': { min: 10, max: 1000 }, // Normal: 30-120
    'Bilirubin Total': { min: 0, max: 50 },        // Normal: 0.3-1.2
    'Bilirubin Direct': { min: 0, max: 25 },       // Normal: 0-0.3
    'Bilirubin Indirect': { min: 0, max: 30 },     // Normal: 0.1-1.0
    'Total Protein': { min: 3, max: 12 },          // Normal: 6.4-8.3
    'Albumin': { min: 1, max: 7 },                 // Normal: 3.5-5.5
    'Globulin': { min: 1, max: 7 },                // Normal: 2.3-3.5
    'A:G Ratio': { min: 0.5, max: 4 }              // Normal: 1.0-2.5
  };
  
  const range = realisticRanges[parameterName];
  
  if (!range) {
    // Unknown parameter, allow it
    return { isValid: true };
  }
  
  if (value < range.min) {
    return { 
      isValid: false, 
      reason: `Value ${value} is below realistic minimum ${range.min} for ${parameterName}`
    };
  }
  
  if (value > range.max) {
    return { 
      isValid: false, 
      reason: `Value ${value} is above realistic maximum ${range.max} for ${parameterName} (likely OCR error)`
    };
  }
  
  return { isValid: true };
}

/**
 * Evaluate LFT numeric status against reference range
 * 
 * @param {number} value - Numeric value
 * @param {string} referenceRange - Reference range (e.g., "15.00-40.00" or "<1.00")
 * @returns {string} - "Normal" | "Low" | "High"
 */
function evaluateLftStatus(value, referenceRange) {
  if (!referenceRange || value === undefined || value === null) return "Normal";
  
  // Parse range patterns
  // Pattern 1: "15.00-40.00" or "0.30-1.20"
  const rangeMatch = referenceRange.match(/^([0-9.]+)\s*-\s*([0-9.]+)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    
    if (!isNaN(min) && !isNaN(max)) {
      if (value < min) return "Low";
      if (value > max) return "High";
      return "Normal";
    }
  }
  
  // Pattern 2: "<1.00" or "< 1.00"
  const lessThanMatch = referenceRange.match(/^<\s*([0-9.]+)$/);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[1]);
    if (!isNaN(max)) {
      return value > max ? "High" : "Normal";
    }
  }
  
  // Pattern 3: ">5.0" or "> 5.0"
  const greaterThanMatch = referenceRange.match(/^>\s*([0-9.]+)$/);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[1]);
    if (!isNaN(min)) {
      return value < min ? "Low" : "Normal";
    }
  }
  
  return "Normal";
}

/**
 * Extract LFT values with column-aware parsing and garbage filtering
 * Prevents extraction of patient demographics and header information
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Extraction results with status evaluation
 */
function extractLiverFunctionWithNormalization(ocrText) {
  const results = [];
  const lines = ocrText.split('\n');
  const extractedParams = new Set(); // Track normalized parameter names
  
  // Strict whitelist for LFT parameters (including OCR error variations)
  const allowedParameters = [
    // AST variations
    'AST (SGOT)', 'AST', 'SGOT', 'ss (scom)', 'ss', 'scom',
    // ALT variations
    'ALT (SGPT)', 'ALT', 'SGPT', 'ao er)', 'ao', 'aer',
    // AST:ALT Ratio variations
    'AST:ALT Ratio', 'ATALT Ratio',
    // GGT variations
    'GGTP', 'GGT', 'jens',
    // Alkaline Phosphatase variations
    'Alkaline Phosphatase (ALP)', 'Alkaline Phosphatase', 'ALP',
    // Bilirubin Total variations
    'Bilirubin Total', 'Total Bilirubin', 'Blirubln Total', 'BlIrubin Total', 'BJlirubln Total', 'Blasi Tots',
    // Bilirubin Direct variations
    'Bilirubin Direct', 'Direct Bilirubin', 'Blirubln Direct', 'BlIrubin Direct', 'BJlirubln Direct', 'Blasi Direct',
    // Bilirubin Indirect variations
    'Bilirubin Indirect', 'Indirect Bilirubin', 'Bilirubln lndlrect', 'Bilirubln Indirect', 'BlIrubin Indirect', 'Blab Indirect',
    // Total Protein variations
    'Total Protein', 'Tora Protein',
    // Albumin
    'Albumin',
    // Globulin
    'Globulin',
    // A:G Ratio variations
    'A:G Ratio', 'A/G Ratio', 'A:GRatio', 'A/GRatio', 'AGRatio', '*eaRato'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip garbage lines (patient info, header, footer)
    if (isLftGarbageLine(line)) {
      continue;
    }
    
    for (const paramName of allowedParameters) {
      // Escape all special regex characters in parameter name
      const escapedParam = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create regex pattern for parameter name (case-insensitive)
      let paramPattern;
      
      if (paramName.includes(' ')) {
        // Regular word boundary for multi-word parameters
        paramPattern = new RegExp(`${escapedParam}`, 'i');
      } else {
        // For single words, use word boundary at the start
        paramPattern = new RegExp(`\\b${escapedParam}`, 'i');
      }
      
      if (!paramPattern.test(line)) {
        continue;
      }
      
      // Normalize parameter name
      const normalizedParam = normalizeLftParameterName(paramName);
      
      // Skip if already extracted
      if (extractedParams.has(normalizedParam)) {
        continue;
      }
      
      // Extract value: everything after parameter name
      const match = line.match(new RegExp(`${escapedParam}\\s+(.+)`, 'i'));
      
      if (!match || !match[1]) {
        continue;
      }
      
      const rawValue = match[1].trim();
      
      // Parse value with column detection
      const valueResult = parseLftValue(rawValue);
      
      if (valueResult.value === null || isNaN(valueResult.value)) {
        continue;
      }
      
      // Validate realistic range
      const validation = isRealisticLftValue(normalizedParam, valueResult.value);
      if (!validation.isValid) {
        console.log(`   ❌ Rejected ${normalizedParam}: ${valueResult.value} - ${validation.reason}`);
        continue;
      }
      
      // Evaluate status
      let status = valueResult.status || 'Normal';
      
      // If OCR didn't mark it but we have a reference range, evaluate it
      if (!valueResult.status && valueResult.referenceRange) {
        status = evaluateLftStatus(valueResult.value, valueResult.referenceRange);
      }
      
      // Mark as extracted
      extractedParams.add(normalizedParam);
      
      // Add to results
      results.push({
        parameter: normalizedParam,
        value: valueResult.value,
        numericValue: valueResult.value,
        unit: valueResult.unit || '',
        referenceRange: valueResult.referenceRange || '',
        status: status,
        type: 'NUMERIC',
        extractionMethod: 'lft-column-aware-extraction'
      });
      
      break;
    }
  }
  
  return results;
}

/**
 * Extract with fallback to legacy extractor
 * @param {string} ocrText - Raw OCR text
 * @param {string} reportType - Optional report type
 * @param {Function} fallbackExtractor - Legacy extractor function
 * @returns {object} - Extraction results
 */
function extractWithFallback(ocrText, reportType = null, fallbackExtractor = null) {
  // Try strict extraction first
  const strictResult = extractWithStrictValidation(ocrText, reportType);
  
  // If we got good results, use them
  if (strictResult.success && strictResult.parameters.length > 0) {
    console.log('✅ Using STRICT extraction results');
    return strictResult;
  }
  
  // Otherwise, try fallback
  if (fallbackExtractor && typeof fallbackExtractor === 'function') {
    console.log('⚠️  Strict extraction failed, trying FALLBACK extractor...');
    try {
      const fallbackResult = fallbackExtractor(ocrText);
      return {
        ...fallbackResult,
        extractionMethod: 'fallback'
      };
    } catch (error) {
      console.error('❌ Fallback extractor failed:', error);
    }
  }
  
  // No results from either method
  return strictResult;
}

/**
 * Quick validation check (no extraction, just validation)
 * @param {Array} extractedResults - Pre-extracted results
 * @param {string} reportType - Report type
 * @returns {object} - Validated results
 */
function validateOnly(extractedResults, reportType = null) {
  console.log('\n🔍 VALIDATION ONLY MODE\n');
  
  const validResults = [];
  const rejectedResults = [];
  
  for (const result of extractedResults) {
    const { parameter, value, unit } = result;
    
    const expectedType = getParameterType(parameter);
    const validation = validateExtractedValue(parameter, value, expectedType);
    
    if (validation.isValid) {
      validResults.push({
        ...result,
        value: validation.cleanValue,
        type: expectedType
      });
      console.log(`✅ ${parameter}: ${validation.cleanValue} ${unit || ''}`);
    } else {
      rejectedResults.push({
        parameter,
        rejectedValue: value,
        reason: validation.reason
      });
      console.log(`❌ ${parameter}: "${value}" - ${validation.reason}`);
    }
  }
  
  // Apply blood sugar or lipid validation if needed
  let finalResults = validResults;
  if (reportType === 'BLOOD_SUGAR') {
    finalResults = validateBloodSugarReport(validResults);
  } else if (reportType === 'LIPID_PROFILE' || reportType === 'LIPID') {
    finalResults = validateLipidReport(validResults);
  }
  
  return {
    success: finalResults.length > 0,
    parameters: finalResults,
    rejected: rejectedResults
  };
}

module.exports = {
  extractWithStrictValidation,
  extractMultipleReports,
  extractWithFallback,
  validateOnly,
  detectReportType,
  KNOWN_PARAMETERS,
};
