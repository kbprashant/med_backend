/**
 * Medical Parameter and Unit Normalization Service
 * 
 * Standardizes medical parameter names and units from different lab formats
 * to ensure consistent database storage and analysis.
 */

/**
 * Normalize measurement units to standard medical format
 * @param {string} unit - Raw unit string from extraction
 * @returns {string} Standardized unit
 */
function normalizeUnit(unit) {
  if (!unit || typeof unit !== 'string') {
    return '';
  }

  // FIX 3: Improved OCR-specific normalization
  let cleaned = unit.trim();
  
  // Handle common OCR variations first
  cleaned = cleaned.replace(/mill\s?mm3/gi, 'million/mm³');
  cleaned = cleaned.replace(/th[oọ]u\s?mm3/gi, 'thousand/mm³');
  cleaned = cleaned.replace(/\bgdl\b/gi, 'g/dL');
  cleaned = cleaned.replace(/\bmid\b/gi, 'mg/dL');  // OCR: mid → mg/dL
  cleaned = cleaned.replace(/\bmgd\b/gi, 'mg/dL');  // OCR: mgd → mg/dL
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, '');
  
  // Convert to lowercase for comparison
  const lower = cleaned.toLowerCase();

  // Standardization mappings
  const unitMappings = [
    // Blood glucose, cholesterol, etc.
    { patterns: [/^mg\s*\/\s*dl$/i, /^mgdl$/i, /^mgs%$/i, /^mid$/i, /^mgd$/i], standard: 'mg/dL' },
    { patterns: [/^mmol\s*\/\s*l$/i, /^mmoll$/i], standard: 'mmol/L' },
    
    // Hemoglobin, protein
    { patterns: [/^g\s*\/\s*dl$/i, /^gdl$/i], standard: 'g/dL' },
    { patterns: [/^g\s*\/\s*l$/i, /^gl$/i], standard: 'g/L' },
    
    // Blood pressure
    { 
      patterns: [
        /^mm\s*of\s*hg$/i, 
        /^mmofhg$/i, 
        /^mmhg$/i, 
        /^mm\s+hg$/i,
        /^mm-hg$/i
      ], 
      standard: 'mm Hg' 
    },
    
    // Heart rate, respiratory rate
    { 
      patterns: [
        /^per\s*\/?\s*min(ute)?$/i, 
        /^permin$/i,
        /^\/\s*min(ute)?$/i,
        /^bpm$/i
      ], 
      standard: 'per/min' 
    },
    
    // Percentage - keep as is
    { patterns: [/^%$/, /^percent$/i, /^percentage$/i], standard: '%' },
    
    // Cell counts (with OCR corruption handling)
    { patterns: [
        /^cells?\s*\/\s*cumm$/i, 
        /^\/cumm$/i,
        /^cells?\s*\/\s*cum[ıi]n$/i,  // OCR: cumm → cumin
        /^\/cum[ıi]n$/i,                // OCR: /cumm → /cumin
        /^cum[ıi]n$/i                   // OCR: standalone cumin
      ], 
      standard: 'cells/cumm' 
    },
    { patterns: [/^cells?\s*\/\s*mm3$/i, /^\/mm3$/i], standard: 'cells/mm³' },
    
    // Volume
    { patterns: [/^ml$/i, /^milliliter$/i], standard: 'mL' },
    { patterns: [/^l$/i, /^liter$/i], standard: 'L' },
    
    // International Units
    { patterns: [/^iu\s*\/\s*l$/i, /^iul$/i], standard: 'IU/L' },
    { patterns: [/^u\s*\/\s*l$/i, /^ul$/i], standard: 'U/L' },
    
    // Micro units
    { patterns: [/^mg\s*\/\s*l$/i, /^mgl$/i], standard: 'mg/L' },
    { patterns: [/^ug\s*\/\s*dl$/i, /^ugdl$/i], standard: 'μg/dL' },
    
    // Seconds (e.g., INR, PT)
    { patterns: [/^sec(onds?)?$/i, /^s$/i], standard: 'seconds' },
    
    // Ratio (e.g., INR)
    { patterns: [/^ratio$/i], standard: 'ratio' }
  ];

  // Check each mapping pattern
  for (const mapping of unitMappings) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(lower)) {
        return mapping.standard;
      }
    }
  }

  // If no match found, return cleaned original
  return cleaned;
}

/**
 * Normalize thyroid parameter names specifically
 * Handles: FT3, FT4, T3 Total, T4 Total, TSH as SEPARATE parameters
 * @param {string} name - Raw parameter name
 * @returns {string} Standardized thyroid parameter name or original if not thyroid
 */
function normalizeThyroidParameter(name) {
  if (!name || typeof name !== 'string') {
    return name;
  }

  // Clean and normalize for comparison
  // Remove commas, parentheses, and extra spaces
  const cleaned = name
    .trim()
    .replace(/[,()]/g, ' ')    // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
  const lower = cleaned.toLowerCase();

  // FT3 variations (Free T3) - flexible pattern for OCR errors
  // Handles: FT3, Free T3, F 13 (OCR error), Free Triiodothyronine (with OCR variations)
  // OCR errors: Trindothvronine, Triodothyronine, Triiodothvronine, Triindothyronine
  if (/^(ft3|free\s+t3|f\s*1\s*3|free\s+tri[ion]{1,3}d[ov]?thyronin[ce]?)(\s+ft3)?$/i.test(lower)) {
    return 'FT3';
  }

  // FT4 variations (Free T4)
  if (/^(ft4|free\s+t4|free\s+thyroxin[ce]?)(\s+ft4)?$/i.test(lower)) {
    return 'FT4';
  }

  // TSH variations
  if (/^(tsh|thyroid\s+stimulating|thyroid\s+stimulating\s+hormone)(\s+tsh)?$/i.test(lower)) {
    return 'TSH';
  }

  // T3 Total variations (NOT Free T3)
  // Must have "total" in the name
  if (/^(t3\s+total|total\s+t3|t3.*total|total.*t3|tri[io]{1,2}do?thyronin[ce]?\s+total|total\s+tri[io]{1,2}do?thyronin[ce]?)$/i.test(lower)) {
    return 'T3 Total';
  }

  // T4 Total variations (NOT Free T4)
  // Must have "total" in the name
  if (/^(t4\s+total|total\s+t4|t4.*total|total.*t4|thyroxin[ce]?\s+total|total\s+thyroxin[ce]?)$/i.test(lower)) {
    return 'T4 Total';
  }

  // Plain T3 (without "total" or "free")
  if (/^(t3|tri[io]{1,2}do?thyronin[ce]?)$/i.test(lower)) {
    return 'T3';
  }

  // Plain T4 (without "total" or "free")
  if (/^(t4|thyroxin[ce]?)$/i.test(lower)) {
    return 'T4';
  }

  // Not a thyroid parameter, return original
  return name;
}

/**
 * Normalize parameter names to standard medical terminology
 * @param {string} name - Raw parameter name from extraction
 * @returns {string} Standardized parameter name
 */
function normalizeParameter(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Clean up the name
  let cleaned = name.trim().replace(/\s+/g, ' ');
  
  // Check if it's a thyroid parameter first (special handling)
  const thyroidNormalized = normalizeThyroidParameter(cleaned);
  if (thyroidNormalized !== cleaned && thyroidNormalized !== name) {
    // It was successfully normalized as a thyroid parameter
    return thyroidNormalized;
  }
  
  // Parameter normalization mappings
  // Each entry has patterns to match and a standard name
  const parameterMappings = [
    // === GLUCOSE / BLOOD SUGAR ===
    {
      patterns: [
        /blood\s+sugar\s+(fasting|fbs)/i,
        /glucose\s+(fasting|fbs)/i,
        /glucose\s+fasting.*\(?plasma\)?/i,  // "Glucose Fasting (Plasma)"
        /fasting\s+(blood\s+)?sugar/i,
        /fasting\s+(blood\s+)?glucose/i,
        /glucose.*fasting.*plasma/i,
        /^fasting$/i,  // Standalone "Fasting" → "Fasting Glucose"
        /^glucose$/i,  // Standalone "Glucose" → assume Fasting in blood sugar context
        /fbs/i
      ],
      standard: 'Fasting Glucose'
    },
    {
      patterns: [
        /blood\s+sugar\s+\(?\s*(post\s*prandial|pp|ppbs)\)?/i,  // With or without parentheses
        /glucose\s+(post\s*prandial|pp|ppbs)/i,
        /glucose\s+pp.*\(?plasma\)?/i,  // "Glucose PP (Plasma)"
        /post\s*prandial\s+(blood\s+)?sugar/i,
        /post\s*prandial\s+(blood\s+)?glucose/i,
        /glucose.*pp.*plasma/i,
        /^post\s*prandial$/i,  // Standalone "Post Prandial"
        /ppbs/i
      ],
      standard: 'Postprandial Glucose'
    },
    {
      patterns: [
        /random\s+(blood\s+)?sugar/i,
        /random\s+(blood\s+)?glucose/i,
        /blood\s+sugar\s+random/i,
        /glucose\s+random/i,
        /rbs/i
      ],
      standard: 'Random Glucose'
    },
    {
      patterns: [
        /hba1c/i,
        /glycated\s+hemoglobin/i,
        /glycosylated\s+hemoglobin/i,
        /hemoglobin\s+a1c/i
      ],
      standard: 'HbA1c'
    },

    // === BLOOD PRESSURE ===
    {
      patterns: [
        /blood\s+pressure\s+systolic/i,
        /bp\s+systolic/i,
        /systolic\s+bp/i,
        /^systolic$/i
      ],
      standard: 'Blood Pressure Systolic'
    },
    {
      patterns: [
        /blood\s+pressure\s+diastolic/i,
        /bp\s+diastolic/i,
        /diastolic\s+bp/i,
        /^diastolic$/i
      ],
      standard: 'Blood Pressure Diastolic'
    },

    // === VITAL SIGNS ===
    {
      patterns: [
        /^pulse$/i,
        /heart\s+rate/i,
        /pulse\s+rate/i
      ],
      standard: 'Pulse'
    },
    {
      patterns: [
        /respiratory\s+rate/i,
        /respiration\s+rate/i,
        /rr$/i
      ],
      standard: 'Respiratory Rate'
    },
    {
      patterns: [
        /body\s+temperature/i,
        /^temperature$/i,
        /temp$/i
      ],
      standard: 'Temperature'
    },

    // === COMPLETE BLOOD COUNT (CBC) ===
    {
      patterns: [
        /^hemoglobin$/i,
        /^hb$/i,
        /^hgb$/i
      ],
      standard: 'Hemoglobin'
    },
    {
      patterns: [
        /red\s+blood\s+cell/i,
        /rbc\s+count/i,
        /^rbc$/i
      ],
      standard: 'RBC Count'
    },
    {
      patterns: [
        /white\s+blood\s+cell/i,
        /wbc\s+count/i,
        /^wbc$/i,
        /total\s+leucocyte/i,
        /tlc/i
      ],
      standard: 'WBC Count'
    },
    {
      patterns: [
        /platelet\s+count/i,
        /^platelets?$/i
      ],
      standard: 'Platelet Count'
    },
    {
      patterns: [
        /hematocrit/i,
        /^hct$/i,
        /packed\s+cell\s+volume/i,
        /^pcv$/i
      ],
      standard: 'Hematocrit'
    },

    // === LIPID PROFILE ===
    // NOTE: Order matters! Check Non-HDL and VLDL BEFORE HDL and LDL
    // to prevent substring matching (e.g., "Non-HDL" contains "HDL")
    // Include OCR misspellings: chalesteral, cholestrol, chalesterol
    {
      patterns: [
        /total\s+cholesterol/i,
        /cholesterol\s+total/i,
        /^cholesterol$/i,
        /total\s+chalesteral/i,      // OCR: cholesterol → chalesteral
        /chalesteral\s+total/i,       // OCR: cholesterol → chalesteral
        /^chalesteral$/i,             // OCR: standalone cholesterol → chalesteral
        /total\s+cholestrol/i,        // OCR: cholesterol → cholestrol
        /cholestrol\s+total/i,        // OCR: cholesterol → cholestrol
        /^cholestrol$/i               // OCR: standalone cholesterol → cholestrol
      ],
      standard: 'Total Cholesterol'
    },
    {
      patterns: [
        /non[-\s]?hdl\s+cholesterol/i,
        /^non[-\s]?hdl$/i
      ],
      standard: 'Non-HDL Cholesterol'
    },
    {
      patterns: [
        /hdl\s+cholesterol/i,
        /hdl\s+chalesteral/i,         // OCR: cholesterol → chalesteral
        /hdl\s+chalesterol/i,         // OCR: cholesterol → chalesterol
        /hdl\s+cholestrol/i,          // OCR: cholesterol → cholestrol
        /^hdl$/i,
        /high\s+density\s+lipoprotein/i
      ],
      standard: 'HDL Cholesterol'
    },
    {
      patterns: [
        /vldl\s+cholesterol/i,
        /vldl\s+chalesteral/i,        // OCR: cholesterol → chalesteral
        /vldl\s+chalesterol/i,        // OCR: cholesterol → chalesterol
        /vldl\s+cholestrol/i,         // OCR: cholesterol → cholestrol
        /^vldl$/i,
        /very\s+low\s+density\s+lipoprotein/i
      ],
      standard: 'VLDL Cholesterol'
    },
    {
      patterns: [
        /ldl\s+cholesterol/i,
        /ldl\s+chalesteral/i,         // OCR: cholesterol → chalesteral
        /ldl\s+chalesterol/i,         // OCR: cholesterol → chalesterol
        /ldl\s+chalesterot/i,         // OCR: cholesterol → chalesterot
        /ldl\s+cholestrol/i,          // OCR: cholesterol → cholestrol
        /^ldl$/i,
        /low\s+density\s+lipoprotein/i
      ],
      standard: 'LDL Cholesterol'
    },
    {
      patterns: [
        /^triglycerides?$/i,
        /^tg$/i
      ],
      standard: 'Triglycerides'
    },

    // === KIDNEY FUNCTION ===
    {
      patterns: [
        /blood\s+urea\s+nitrogen/i,
        /^bun$/i
      ],
      standard: 'Blood Urea Nitrogen'
    },
    {
      patterns: [
        /serum\s+creatinine/i,
        /^creatinine$/i
      ],
      standard: 'Creatinine'
    },
    {
      patterns: [
        /uric\s+acid/i,
        /^urate$/i
      ],
      standard: 'Uric Acid'
    },

    // === LIVER FUNCTION ===
    // NOTE: Check ratio patterns BEFORE individual parameters to prevent substring matching
    {
      patterns: [
        /ast[\/:\s]+alt\s+ratio/i,
        /ast[\/:]alt\s*ratio/i,
        /de\s+ritis\s+ratio/i
      ],
      standard: 'AST/ALT Ratio'
    },
    {
      patterns: [
        /\bsgot\b/i,
        /\bast\b/i,
        /aspartate\s+aminotransferase/i
      ],
      standard: 'AST (SGOT)'
    },
    {
      patterns: [
        /\bsgpt\b/i,
        /\balt\b/i,
        /alanine\s+aminotransferase/i
      ],
      standard: 'ALT (SGPT)'
    },
    {
      patterns: [
        /a[\/:\s]+g\s+ratio/i,
        /albumin[\/\s]+globulin\s+ratio/i
      ],
      standard: 'A/G Ratio'
    },
    {
      patterns: [
        /total\s+bilirubin/i,
        /^bilirubin$/i
      ],
      standard: 'Total Bilirubin'
    }

    // === Note: THYROID parameters handled by normalizeThyroidParameter() ===
    // === Added as a separate function for more precise control ===
  ];

  // Check each mapping pattern
  for (const mapping of parameterMappings) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(cleaned)) {
        return mapping.standard;
      }
    }
  }

  // If no match found, return cleaned original
  // This ensures unknown parameters still get stored
  return cleaned;
}

/**
 * Remove duplicate parameters from extraction results
 * Keeps the last occurrence of each unique parameter name
 * @param {Array} extractedData - Array of {parameter, value, unit, status}
 * @returns {Array} Deduplicated array
 */
function removeDuplicates(extractedData) {
  if (!Array.isArray(extractedData) || extractedData.length === 0) {
    return [];
  }

  // Create a Map to store unique parameters (first occurrence wins for reliability)
  const uniqueParams = new Map();

  for (const item of extractedData) {
    if (!item || !item.parameter) continue;

    // Use normalized parameter name as the key
    const normalizedName = normalizeParameter(item.parameter);
    
    // Store with normalized name as key
    // If duplicate exists, KEEP THE FIRST occurrence (more reliable than last)
    if (!uniqueParams.has(normalizedName)) {
      uniqueParams.set(normalizedName, {
        ...item,
        parameter: normalizedName,
        unit: normalizeUnit(item.unit)
      });
    }
  }

  // Convert Map back to array
  return Array.from(uniqueParams.values());
}

/**
 * Full normalization pipeline for extracted medical data
 * @param {Array} extractedData - Raw extraction results
 * @returns {Array} Normalized and deduplicated results
 */
function normalizeExtractedData(extractedData) {
  if (!Array.isArray(extractedData) || extractedData.length === 0) {
    return [];
  }

  // Step 1: Normalize each item
  const normalized = extractedData.map(item => {
    if (!item || !item.parameter) return null;

    return {
      ...item,
      parameter: normalizeParameter(item.parameter),
      unit: normalizeUnit(item.unit || '')
    };
  }).filter(item => item !== null);

  // Step 2: Remove duplicates (keep last occurrence)
  return removeDuplicates(normalized);
}

module.exports = {
  normalizeUnit,
  normalizeParameter,
  normalizeThyroidParameter,
  removeDuplicates,
  normalizeExtractedData
};
