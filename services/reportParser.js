/**
 * Medical Report Parser Service
 * 
 * Extracts parameter values from OCR text based on predefined category parameters.
 * 
 * IMPORTANT RULES:
 * - Test name/category is NOT detected from OCR
 * - Category is strictly taken from request input
 * - Only extracts parameters defined for that category
 * - Ignores unrelated values in OCR text
 * - Uses regex for numeric extraction
 */

const { getParametersForCategory, categoryExists } = require('../config/reportParameters');

/**
 * Normalize OCR text for better matching
 * Enhanced to handle common OCR errors
 * @param {string} text - Raw OCR text
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    // Common OCR character substitutions
    .replace(/[Il1\|]/g, 'l')        // I, 1, | -> l
    .replace(/[O0]/g, '0')            // O -> 0 for numbers
    .replace(/[{}\[\]]/g, '(')        // Brackets variations
    .replace(/suger/gi, 'sugar')      // Common misspelling
    .replace(/haemoglobin/gi, 'hemoglobin')  // UK spelling
    .replace(/d[!l\|1]/gi, 'dl')      // dl variations (d!, dl, d|, d1)
    .replace(/\/d[!l]/gi, '/dl')      // /d! -> /dl
    .replace(/cumm/gi, 'cumm')        // Normalize cumm
    .replace(/\s+/g, ' ')             // Normalize multiple spaces
    .replace(/\n+/g, ' ')             // Convert newlines to spaces
    .replace(/\t+/g, ' ')             // Convert tabs to spaces
    .replace(/[""]/g, '"')            // Normalize quotes
    .replace(/['']/g, "'")            // Normalize apostrophes
    .trim();
}

/**
 * Extract numeric value near a parameter alias
 * Enhanced with fuzzy matching for OCR errors
 * @param {string} text - Normalized OCR text
 * @param {string} alias - Parameter alias to search for
 * @returns {Object|null} Extracted value and unit, or null
 */
function extractValueForAlias(text, alias) {
  // Create fuzzy versions of the alias to handle OCR errors
  const aliasVariations = generateAliasVariations(alias);
  
  // Try each variation
  for (const aliasVariation of aliasVariations) {
    // Escape special regex characters
    const escapedAlias = aliasVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Enhanced pattern to match alias followed by value
    // More flexible to handle OCR noise
    const pattern = new RegExp(
      escapedAlias + 
      '[\\s:.,\\-_(){}\\[\\]]*' +          // Very flexible separator (handles noise)
      '([+-]?\\d+(?:[.,]\\d+)?)',        // Capture numeric value (handles comma as decimal)
      'i'
    );
    
    const match = text.match(pattern);
    
    if (match) {
      const value = match[1].replace(',', '.'); // Normalize comma to period
      const startIndex = match.index + match[0].length;
      
      // Extract unit if present (look ahead up to 50 characters to account for methodology labels)
      const textAfterValue = text.slice(startIndex, startIndex + 50);
      const unit = extractUnit(textAfterValue);
      
      return {
        value: value,
        unit: unit
      };
    }
  }
  
  return null;
}

/**
 * Generate alias variations to handle OCR errors
 * @param {string} alias - Original alias
 * @returns {Array<string>} Array of alias variations
 */
function generateAliasVariations(alias) {
  const variations = [alias.toLowerCase()];
  
  // Add common OCR error variations
  const ocrErrorMap = {
    'sugar': ['suger', 'suqar', 'sugat'],
    'glucose': ['qibcose', 'qiucose', 'gllcose'],
    'hemoglobin': ['haemoglobin', 'hemoglob!n', 'haemoglob!n'],
    'fasting': ['tasting', 'fastinq', 'fastlng'],
    'random': ['rnadom', 'randorn', 'randon'],
    'creatinine': ['creatinlne', 'creatlnine', 'cteatinine'],
    'cholesterol': ['choiesterol', 'cholestero!', 'cholestrol'],
    'triglyceride': ['trigiyceride', 'triglycerlde', 'triqlyceride'],
    'bilirubin': ['bi!irubin', 'bilirubln', 'bi1irubin'],
    'platelet': ['piatelet', 'platelet', 'p!atelet'],
  };
  
  // Check if alias has known variations
  for (const [key, vars] of Object.entries(ocrErrorMap)) {
    if (alias.toLowerCase().includes(key)) {
      vars.forEach(v => {
        const variantAlias = alias.toLowerCase().replace(key, v);
        if (!variations.includes(variantAlias)) {
          variations.push(variantAlias);
        }
      });
    }
  }
  
  return variations;
}

/**
 * Extract unit from text following a numeric value
 * Enhanced to handle OCR errors in units and skip methodology labels
 * @param {string} text - Text after numeric value
 * @returns {string|null} Extracted unit or null
 */
function extractUnit(text) {
  // First, clean the text by removing common test methodology labels and noise
  // These are NOT units but test methods that OCR picks up
  let cleanedText = text
    .replace(/^\s*(god|pod|chod|pap|gpt|got|trinder|jaffe|kinetic|enzymatic|colorimetric|method)\b/i, '')  // Remove methodology labels
    .replace(/^\s*[&*#@~]+\s*/g, '')  // Remove noise symbols
    .trim();
  
  // Common medical units - now more flexible for OCR errors
  const unitPatterns = [
    // Blood count units (flexible for OCR errors)
    /^\s*(cells?\/cumm|cells?\/mm3|10\^3\/u[l1]|10\^6\/u[l1]|million\/cumm|thousand\/cumm)/i,
    
    // Concentration units (handles d!, dl, d1 variations)
    /^\s*(mg\/d[l!1]|g\/d[l!1]|g\/[l1]|mmo[l1]\/[l1]|umo[l1]\/[l1]|nmo[l1]\/[l1]|pmo[l1]\/[l1])/i,
    
    // Enzyme units
    /^\s*([i!1]u\/[l1]|u\/[l1]|units?\/[l1]|units?\/m[l1])/i,
    
    // Percentage
    /^\s*(%|percent)/i,
    
    // Volume
    /^\s*(f[l1]|femto[l1]iters?|femto[l1]itres?)/i,
    
    // Mass
    /^\s*(pg|picograms?|ng\/m[l1]|ug\/m[l1]|mg\/m[l1])/i,
    
    // Blood pressure
    /^\s*(mmhg|mm\s*hg)/i,
    
    // Heart rate
    /^\s*(bpm|beats?\/min)/i,
    
    // Time
    /^\s*(mm\/hr|mm\/1st hr|minutes?|hours?)/i,
    
    // pH (no unit)
    /^\s*(ph units?)/i,
    
    // Ratio (no unit typically)
    /^\s*(ratio)/i
  ];
  
  // Try to match units in cleaned text
  for (const pattern of unitPatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // If no unit found in cleaned text, return null (not the methodology label)
  return null;
}

/**
 * Get default unit for a parameter when OCR fails to extract it
 * @param {string} parameterName - Name of the parameter
 * @returns {string|null} Default unit or null
 */
function getDefaultUnit(parameterName) {
  const paramLower = parameterName.toLowerCase();
  
  // Blood sugar / glucose tests
  if (paramLower.includes('blood sugar') || paramLower.includes('glucose') || paramLower.includes('sugar')) {
    return 'mg/dl';
  }
  
  // Hemoglobin
  if (paramLower.includes('hemoglobin') || paramLower.includes('haemoglobin') || paramLower === 'hb') {
    return 'g/dl';
  }
  
  // Cholesterol and lipid tests
  if (paramLower.includes('cholesterol') || paramLower.includes('triglyceride') || 
      paramLower.includes('ldl') || paramLower.includes('hdl') || paramLower.includes('vldl')) {
    return 'mg/dl';
  }
  
  // Kidney function tests
  if (paramLower.includes('creatinine') || paramLower.includes('urea') || paramLower.includes('bun')) {
    return 'mg/dl';
  }
  
  // Liver enzymes
  if (paramLower.includes('sgot') || paramLower.includes('sgpt') || 
      paramLower.includes('alt') || paramLower.includes('ast') ||
      paramLower.includes('alp') || paramLower.includes('ggt')) {
    return 'U/L';
  }
  
  // Bilirubin
  if (paramLower.includes('bilirubin')) {
    return 'mg/dl';
  }
  
  // Thyroid tests
  if (paramLower.includes('tsh')) {
    return 'mIU/L';
  }
  if (paramLower.includes('t3') || paramLower.includes('t4')) {
    return 'ng/dl';
  }
  
  // HbA1c
  if (paramLower.includes('hba1c') || paramLower.includes('a1c')) {
    return '%';
  }
  
  // Blood counts
  if (paramLower.includes('wbc') || paramLower.includes('rbc') || paramLower.includes('platelet')) {
    return 'cells/cumm';
  }
  
  // Default: no unit
  return null;
}

/**
 * Parse medical report and extract parameter values
 * @param {string} category - Report category (from request, NOT detected from OCR)
 * @param {string} ocrText - Raw OCR text from medical report
 * @returns {Object} Extraction results
 */
async function parseMedicalReport(category, ocrText) {
  try {
    // Validate inputs
    if (!category) {
      return {
        success: false,
        message: 'Category is required'
      };
    }
    
    if (!ocrText || ocrText.trim().length === 0) {
      return {
        success: false,
        message: 'OCR text is empty'
      };
    }
    
    // Validate category exists
    if (!categoryExists(category)) {
      return {
        success: false,
        message: `Invalid category: ${category}. Category not found in configuration.`
      };
    }
    
    // Get parameters for this category
    const parameters = getParametersForCategory(category);
    
    if (!parameters || parameters.length === 0) {
      return {
        success: false,
        message: `No parameters defined for category: ${category}`
      };
    }
    
    // Normalize OCR text for better matching
    const normalizedText = normalizeText(ocrText);
    
    // Extract values for each parameter
    const extractedResults = [];
    const foundParameters = new Set(); // Avoid duplicates
    
    for (const parameter of parameters) {
      // Skip if already found (prevents duplicates)
      if (foundParameters.has(parameter.name)) {
        continue;
      }
      
      // Try each alias until we find a match
      let extracted = null;
      
      for (const alias of parameter.aliases) {
        extracted = extractValueForAlias(normalizedText, alias);
        
        if (extracted) {
          // Apply default units if none found
          let unit = extracted.unit;
          if (!unit || unit === 'null' || unit === '') {
            unit = getDefaultUnit(parameter.name);
          }
          
          // Found a value for this parameter
          extractedResults.push({
            parameter: parameter.name,
            value: extracted.value,
            unit: unit
          });
          
          foundParameters.add(parameter.name);
          break; // Stop searching aliases for this parameter
        }
      }
    }
    
    // Check if any parameters were extracted
    if (extractedResults.length === 0) {
      return {
        success: false,
        message: 'No required parameters found for this category'
      };
    }
    
    // Return successful extraction
    return {
      success: true,
      extractedResults: extractedResults
    };
    
  } catch (error) {
    console.error('Error in parseMedicalReport:', error);
    return {
      success: false,
      message: 'An error occurred during report parsing',
      error: error.message
    };
  }
}

/**
 * Validate extraction results (optional helper)
 * @param {Array} extractedResults - Results from parsing
 * @returns {Object} Validation result
 */
function validateExtraction(extractedResults) {
  if (!Array.isArray(extractedResults) || extractedResults.length === 0) {
    return {
      isValid: false,
      message: 'No parameters extracted'
    };
  }
  
  // Check that all results have required fields
  for (const result of extractedResults) {
    if (!result.parameter || !result.value) {
      return {
        isValid: false,
        message: 'Invalid extraction format - missing parameter or value'
      };
    }
  }
  
  return {
    isValid: true,
    message: `Successfully extracted ${extractedResults.length} parameter(s)`
  };
}

module.exports = {
  parseMedicalReport,
  normalizeText,
  extractValueForAlias,
  extractUnit,
  validateExtraction,
  generateAliasVariations,
  getDefaultUnit
};
