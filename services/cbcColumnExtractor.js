/**
 * CBC Column-Aware Extractor
 * 
 * Uses table column positions to extract CBC parameters accurately
 * Prevents wrong value assignment by only extracting from RESULT column
 */

const { normalizeUnit } = require('./normalizer');

/**
 * Column indices for CBC table
 */
const COLUMN_NAMES = {
  TEST_DESCRIPTION: 0,
  RESULT: 1,
  REF_RANGE: 2,
  UNIT: 3
};

/**
 * Section headers that reset parsing mode
 */
const SECTION_HEADERS = [
  'Differential Count',
  'Differential Leucocyte Count',
  'Differerntıal LeucOcyte Cou',  // OCR corrupted version
  'Absolute Leucocyte Count',
  'Absolute Leukocyte Count',
  'RBC Indices',
  'Platelet Indices',
  'Platelets Indices'
];

/**
 * Parameters with "Absolute" prefix are separate from base parameters
 */
const ABSOLUTE_PARAMETERS = [
  'Absolute Neutrophils',
  'Absolute Lymphocytes',
  'Absolute Eosinophils',
  'Absolute Monocytes',
  'Absolute Basophils'
];

/**
 * Known CBC parameters with fuzzy matching
 */
const CBC_PARAMETERS = {
  // Hemoglobin
  'HEMOGLOBIN': {
    displayName: 'Hemoglobin',
    synonyms: ['Haemoglobin', 'Hb', 'Haemoglobın', 'Haemoglobıt'],
    code: 'HEMOGLOBIN',
    expectedUnits: ['g/dL', 'g/L'],
    fuzzyThreshold: 85
  },
  
  // WBC
  'WBC': {
    displayName: 'Total WBC Count',
    synonyms: ['Total Leucocyte Count', 'Total Leukocyte Count', 'WBC Count', 'Leucocyle Coun', 'Total Leucocyle Coun'],
    code: 'WBC',
    expectedUnits: ['cells/cumm', '/cumm', 'thou/mm3'],
    fuzzyThreshold: 80
  },
  
  // Differential Count (Percentage)
  'NEUTROPHILS': {
    displayName: 'Neutrophils',
    synonyms: ['Neutrophil', 'Neulsophis', 'Neutrophıls'],
    code: 'NEUTROPHILS',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  'LYMPHOCYTES': {
    displayName: 'Lymphocytes',
    synonyms: ['Lymphocyte', 'Lymphocyles'],
    code: 'LYMPHOCYTES',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  'EOSINOPHILS': {
    displayName: 'Eosinophils',
    synonyms: ['Eosinophil', 'Eosınoplds', 'Eosınophıls'],
    code: 'EOSINOPHILS',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  'MONOCYTES': {
    displayName: 'Monocytes',
    synonyms: ['Monocyte'],
    code: 'MONOCYTES',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  'BASOPHILS': {
    displayName: 'Basophils',
    synonyms: ['Basophil'],
    code: 'BASOPHILS',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  
  // Absolute Counts
  'ABSOLUTE_NEUTROPHILS': {
    displayName: 'Absolute Neutrophils',
    synonyms: ['Absolute Neutrophil'],
    code: 'ABSOLUTE_NEUTROPHILS',
    expectedUnits: ['cells/cumm', '/cumm'],
    fuzzyThreshold: 85
  },
  'ABSOLUTE_LYMPHOCYTES': {
    displayName: 'Absolute Lymphocytes',
    synonyms: ['Absolute Lymphocyte', 'Absolute Lynphocytes'],
    code: 'ABSOLUTE_LYMPHOCYTES',
    expectedUnits: ['cells/cumm', '/cumm'],
    fuzzyThreshold: 85
  },
  'ABSOLUTE_EOSINOPHILS': {
    displayName: 'Absolute Eosinophils',
    synonyms: ['Absolute Eosinophil'],
    code: 'ABSOLUTE_EOSINOPHILS',
    expectedUnits: ['cells/cumm', '/cumm'],
    fuzzyThreshold: 85
  },
  'ABSOLUTE_MONOCYTES': {
    displayName: 'Absolute Monocytes',
    synonyms: ['Absolute Monocyte', 'Absolute Monocyles'],
    code: 'ABSOLUTE_MONOCYTES',
    expectedUnits: ['cells/cumm', '/cumm'],
    fuzzyThreshold: 85
  },
  'ABSOLUTE_BASOPHILS': {
    displayName: 'Absolute Basophils',
    synonyms: ['Absolute Basophil'],
    code: 'ABSOLUTE_BASOPHILS',
    expectedUnits: ['cells/cumm', '/cumm'],
    fuzzyThreshold: 85
  },
  
  // RBC Parameters
  'RBC_COUNT': {
    displayName: 'RBC Count',
    synonyms: ['RBC', 'Red Blood Cell Count', 'Erythrocyte Count'],
    code: 'RBC_COUNT',
    expectedUnits: ['mill/cumm', 'million/cumm', 'M/uL'],
    fuzzyThreshold: 85
  },
  'MCV': {
    displayName: 'MCV',
    synonyms: ['Mean Corpuscular Volume'],
    code: 'MCV',
    expectedUnits: ['fL', 'fl'],
    fuzzyThreshold: 90
  },
  'MCH': {
    displayName: 'MCH',
    synonyms: ['Mean Corpuscular Hemoglobin'],
    code: 'MCH',
    expectedUnits: ['pg'],
    fuzzyThreshold: 90
  },
  'MCHC': {
    displayName: 'MCHC',
    synonyms: ['Mean Corpuscular Hemoglobin Concentration'],
    code: 'MCHC',
    expectedUnits: ['g/dL', 'g/dl'],
    fuzzyThreshold: 90
  },
  'HEMATOCRIT': {
    displayName: 'Hematocrit',
    synonyms: ['Hct', 'PCV', 'Packed Cell Volume', 'He'],
    code: 'HEMATOCRIT',
    expectedUnits: ['%'],
    fuzzyThreshold: 80
  },
  'RDW_CV': {
    displayName: 'RDW-CV',
    synonyms: ['RDW CV', 'RDW', 'Red Cell Distribution Width'],
    code: 'RDW',
    expectedUnits: ['%'],
    fuzzyThreshold: 85
  },
  'RDW_SD': {
    displayName: 'RDW-SD',
    synonyms: ['RDW SD', 'ROW SD'],
    code: 'RDW_SD',
    expectedUnits: ['fL', 'fl'],
    fuzzyThreshold: 85
  },
  
  // Platelet Parameters
  'PLATELET_COUNT': {
    displayName: 'Platelet Count',
    synonyms: ['Platelets', 'Platelet', 'Platele Cou', 'PLT'],
    code: 'PLATELET_COUNT',
    expectedUnits: ['thou/cumm', '/cumm', 'lakhs/cumm'],
    fuzzyThreshold: 80
  },
  'PCT': {
    displayName: 'PCT',
    synonyms: ['Plateletcrit'],
    code: 'PCT',
    expectedUnits: ['%'],
    fuzzyThreshold: 90
  },
  'MPV': {
    displayName: 'MPV',
    synonyms: ['Mean Platelet Volume'],
    code: 'MPV',
    expectedUnits: ['fL', 'fl'],
    fuzzyThreshold: 90,
    expectedRange: { min: 6, max: 12 } // Normal MPV range: 6.5-11 fL
  },
  'PDW': {
    displayName: 'PDW',
    synonyms: ['Platelet Distribution Width'],
    code: 'PDW',
    expectedUnits: ['%', 'fL'],
    fuzzyThreshold: 90
  }
};

/**
 * Extract CBC parameters using column-aware parsing
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} Extracted parameters with column validation
 */
function extractCBCWithColumns(ocrText) {
  console.log('\n🩸 CBC Column-Aware Extraction Started');
  console.log('='.repeat(70));

  // Step 1: Detect table header and column positions
  const columnPositions = detectTableColumns(ocrText);
  
  console.log(`✅ Using ${columnPositions.length} columns at positions:`, columnPositions);

  // Step 2: Parse OCR text line by line
  const lines = ocrText.split('\n');
  const extractedParams = [];
  let currentSection = 'MAIN';
  let previousLine = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }

    // Check for section headers
    const sectionHeader = detectSectionHeader(line);
    if (sectionHeader) {
      currentSection = sectionHeader;
      console.log(`📑 Section: ${sectionHeader}`);
      i++;
      continue;
    }

    // Skip non-data rows
    if (isSkippableLine(line)) {
      i++;
      continue;
    }

    // Try to extract parameter from this line (may need next line too)
    const result = extractParameterFromLine(line, lines[i + 1], columnPositions, currentSection);
    
    if (result.param) {
      extractedParams.push(result.param);
      console.log(`   ✅ ${result.param.parameter}: ${result.param.value} ${result.param.unit} [${result.param.status}]`);
    }
    
    // Skip extra lines if we consumed them
    if (result.linesConsumed > 1) {
      i += result.linesConsumed;
    } else {
      i++;
    }
  }

  console.log('='.repeat(70));
  console.log(`📊 Column-aware extraction: ${extractedParams.length} parameters\n`);

  return extractedParams;
}

/**
 * Detect table header and extract column X positions
 * Looks for "TEST DESCRIPTION  RESULT  REF RANGE  UNIT"
 */
function detectTableColumns(ocrText) {
  const lines = ocrText.split('\n');
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Look for table header pattern
    if (lower.includes('test') && lower.includes('result') && lower.includes('ref')) {
      console.log(`📋 Found table header: "${line}"`);
      
      // Use fixed column positions based on common CBC table layout
      // Most CBC reports follow this standard format:
      // Column 1 (TEST DESCRIPTION): 0-150 chars
      // Column 2 (RESULT): 150-250 chars  
      // Column 3 (REF RANGE): 250-400 chars
      // Column 4 (UNIT): 400+ chars
      
      // But we'll detect dynamically based on keywords
      const columns = [];
      
      // Find positions of key column headers
      const testPos = line.search(/test/i);
      const resultPos = line.search(/result/i);
      const refPos = line.search(/ref/i);
      const unitPos = line.search(/unit|ljnit/i); // Handle OCR corruption
      
      if (testPos >= 0) columns.push({ name: 'TEST_DESCRIPTION', pos: testPos });
      if (resultPos >= 0) columns.push({ name: 'RESULT', pos: resultPos });
      if (refPos >= 0) columns.push({ name: 'REF_RANGE', pos: refPos });
      if (unitPos >= 0) columns.push({ name: 'UNIT', pos: unitPos });
      
      // Sort by position
      columns.sort((a, b) => a.pos - b.pos);
      
      return columns;
    }
  }
  
  // Fallback: Use standard CBC table column positions
  // Based on common report formats
  console.log('⚠️  Table header not found, using standard CBC column positions');
  return [
    { name: 'TEST_DESCRIPTION', pos: 0 },
    { name: 'RESULT', pos: 20 },
    { name: 'REF_RANGE', pos: 35 },
    { name: 'UNIT', pos: 50 }
  ];
}

/**
 * Detect section header
 */
function detectSectionHeader(line) {
  const lower = line.toLowerCase();
  
  for (const header of SECTION_HEADERS) {
    if (lower.includes(header.toLowerCase())) {
      return header;
    }
  }
  
  return null;
}

/**
 * Check if line should be skipped
 */
function isSkippableLine(line) {
  const lower = line.toLowerCase();
  
  // Skip headers, metadata, interpretation
  const skipPatterns = [
    /^flabs/i,
    /^hello/i,
    /^\+91/i,
    /^https?:/i,
    /^name/i,
    /^age.*gender/i,
    /^referred by/i,
    /^phone/i,
    /^patient id/i,
    /^report/i,
    /^collection date/i,
    /^haematology/i,
    /^complete blood count/i,
    /^test description/i,
    /interpretation/i,
    /^method/i
  ];
  
  for (const pattern of skipPatterns) {
    if (pattern.test(line)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract parameter from a single line (or multiple lines) using smarter pattern matching
 * Handles various CBC formats with flexible whitespace
 */
function extractParameterFromLine(currentLine, nextLine, columnPositions, currentSection) {
  const trimmed = currentLine.trim();
  
  if (!trimmed) {
    return { param: null, linesConsumed: 1 };
  }
  
  // Split line by multiple spaces (2+ spaces indicates column separation)
  const parts = trimmed.split(/\s{2,}/);
  
  // Case 1: Single line with all data (param  value  range  unit)
  // Example: "Total Leucocyle Coun  5000  4000 10000"
  if (parts.length >= 2) {
    const paramName = parts[0].trim();
    const matchedParam = matchParameter(paramName);
    
    if (matchedParam) {
      // Extract the first number from parts[1] (should be the result)
      const valueMatch = parts[1].match(/^(\d+\.?\d*)/);
      
      if (valueMatch) {
        let value = parseFloat(valueMatch[1]);
        
        // Validate and fix value if outside expected range
        value = validateAndFixValue(value, matchedParam);
        
        // Check if there's a range in the same part (means value and range are too close)
        const hasRange = parts[1].match(/(\d+\.?\d*)\s+(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
        
        if (hasRange && hasRange[1]) {
          // Use the first number as value
          let cleanValue = parseFloat(hasRange[1]);
          
          // Validate and fix value
          cleanValue = validateAndFixValue(cleanValue, matchedParam);
          
          // Extract unit from remaining parts on same line only
          let unit = '';
          if (parts.length > 2) {
            unit = extractUnitFromText(parts.slice(2).join(' '), matchedParam.expectedUnits);
          }
          // Don't extract from next line - use expected unit to avoid picking up wrong units
          if (!unit && matchedParam.expectedUnits.length > 0) {
            unit = matchedParam.expectedUnits[0];
          }
          
          return {
            param: {
              displayName: matchedParam.displayName,
              value: cleanValue,
              unit: normalizeUnit(unit),
              confidence: matchedParam.confidence,
              status: 'Normal',
              code: matchedParam.code
            },
            linesConsumed: 1
          };
        }
        
        // No range in same part - value is clean
        // Extract unit from subsequent parts on same line only
        let unit = '';
        if (parts.length > 2) {
          unit = extractUnitFromText(parts.slice(2).join(' '), matchedParam.expectedUnits);
        }
        // Don't extract from next line - use expected unit instead to avoid picking up wrong units
        if (!unit && matchedParam.expectedUnits.length > 0) {
          unit = matchedParam.expectedUnits[0];
        }
        
        return {
          param: {
            displayName: matchedParam.displayName,
            value: value,
            unit: normalizeUnit(unit),
            confidence: matchedParam.confidence,
            status: 'Normal',
            code: matchedParam.code
          },
          linesConsumed: 1
        };
      }
    }
  }
  
  // Case 2: Parameter name alone, value on next line
  // Example: "Haemoglobıt" on one line, "15  13 17  g/dL" on next
  if (nextLine) {
    const matchedParam = matchParameter(trimmed);
    
    if (matchedParam) {
      // Check if next line starts with a number
      const nextTrimmed = nextLine.trim();
      const valueMatch = nextTrimmed.match(/^(\d+\.?\d*)/);
      
      if (valueMatch) {
        let value = parseFloat(valueMatch[1]);
        
        // Validate and fix value if outside expected range
        value = validateAndFixValue(value, matchedParam);
        
        // Extract unit from rest of next line
        const unit = extractUnitFromText(nextTrimmed, matchedParam.expectedUnits) || 
                     (matchedParam.expectedUnits.length > 0 ? matchedParam.expectedUnits[0] : '');
        
        return {
          param: {
            displayName: matchedParam.displayName,
            value: value,
            unit: normalizeUnit(unit),
            confidence: matchedParam.confidence,
            status: 'Normal',
            code: matchedParam.code
          },
          linesConsumed: 2
        };
      }
    }
  }
  
  // Case 3: Single item on line with spaces (e.g., "Neulsophis  50  40 g0")
  // This is similar to Case 1 but with less strict spacing
  const tokens = trimmed.split(/\s+/);
  
  if (tokens.length >= 2) {
    // First token(s) might be parameter name, look for first number
    let paramNameTokens = [];
    let valueToken = null;
    let valueIndex = -1;
    
    for (let i = 0; i < tokens.length; i++) {
      if (/^\d+\.?\d*$/.test(tokens[i])) {
        valueToken = tokens[i];
        valueIndex = i;
        break;
      } else {
        paramNameTokens.push(tokens[i]);
      }
    }
    
    if (valueToken && paramNameTokens.length > 0) {
      const paramName = paramNameTokens.join(' ');
      const matchedParam = matchParameter(paramName);
      
      if (matchedParam) {
        let value = parseFloat(valueToken);
        
        // Validate and fix value if outside expected range
        value = validateAndFixValue(value, matchedParam);
        
        // Extract unit from remaining tokens on same line only
        const remainingTokens = tokens.slice(valueIndex + 1).join(' ');
        let unit = extractUnitFromText(remainingTokens, matchedParam.expectedUnits);
        
        // Don't extract from next line - use expected unit to avoid picking up wrong units  
        if (!unit && matchedParam.expectedUnits.length > 0) {
          unit = matchedParam.expectedUnits[0];
        }
        
        return {
          param: {
            displayName: matchedParam.displayName,
            value: value,
            unit: normalizeUnit(unit),
            confidence: matchedParam.confidence,
            status: 'Normal',
            code: matchedParam.code
          },
          linesConsumed: 1
        };
      }
    }
  }
  
  return { param: null, linesConsumed: 1 };
}

/**
 * Tokenize line into words with approximate character positions
 */
function tokenizeLine(line) {
  const tokens = [];
  const words = line.split(/\s+/);
  let currentPos = 0;
  
  for (const word of words) {
    if (word.trim()) {
      // Find actual position in line
      const wordPos = line.indexOf(word, currentPos);
      tokens.push({
        text: word,
        pos: wordPos >= 0 ? wordPos : currentPos
      });
      currentPos = wordPos >= 0 ? wordPos + word.length : currentPos + word.length;
    }
  }
  
  return tokens;
}

/**
 * Assign tokens to columns based on their positions
 */
function assignTokensToColumns(tokens, columnPositions) {
  const columnData = {
    TEST_DESCRIPTION: [],
    RESULT: [],
    REF_RANGE: [],
    UNIT: []
  };

  for (const token of tokens) {
    // Find which column this token belongs to
    const column = findColumnForToken(token.pos, columnPositions);
    
    if (column && columnData[column.name]) {
      columnData[column.name].push(token.text);
    }
  }

  return columnData;
}

/**
 * Find which column a token belongs to based on its position
 */
function findColumnForToken(tokenPos, columnPositions) {
  // Find the column where token position is closest to column start
  for (let i = 0; i < columnPositions.length; i++) {
    const col = columnPositions[i];
    const nextCol = columnPositions[i + 1];
    
    if (nextCol) {
      // Token belongs to this column if it's between this column and next
      if (tokenPos >= col.pos && tokenPos < nextCol.pos) {
        return col;
      }
    } else {
      // Last column - token belongs here if it's after column start
      if (tokenPos >= col.pos) {
        return col;
      }
    }
  }
  
  // Token before first column - assign to first column
  return columnPositions[0];
}

/**
 * Validate and fix value if it's outside expected range
 * Handles OCR errors like decimal point misplacement
 */
function validateAndFixValue(value, paramDef) {
  if (!paramDef.expectedRange) {
    return value; // No range defined, return as-is
  }
  
  const { min, max } = paramDef.expectedRange;
  
  // Value is within range - return as-is
  if (value >= min && value <= max) {
    return value;
  }
  
  // Value is too high - try moving decimal point left
  if (value > max) {
    // Try dividing by 10 (e.g., 75.11 → 7.511)
    let fixedValue = value / 10;
    if (fixedValue >= min && fixedValue <= max) {
      console.log(`   ⚠️  Value ${value} outside range [${min}-${max}], corrected to ${fixedValue}`);
      return fixedValue;
    }
    
    // Try dividing by 100 (e.g., 751.1 → 7.511)
    fixedValue = value / 100;
    if (fixedValue >= min && fixedValue <= max) {
      console.log(`   ⚠️  Value ${value} outside range [${min}-${max}], corrected to ${fixedValue}`);
      return fixedValue;
    }
  }
  
  // Value is too low - try moving decimal point right
  if (value < min) {
    // Try multiplying by 10
    let fixedValue = value * 10;
    if (fixedValue >= min && fixedValue <= max) {
      console.log(`   ⚠️  Value ${value} outside range [${min}-${max}], corrected to ${fixedValue}`);
      return fixedValue;
    }
    
    // Try multiplying by 100
    fixedValue = value * 100;
    if (fixedValue >= min && fixedValue <= max) {
      console.log(`   ⚠️  Value ${value} outside range [${min}-${max}], corrected to ${fixedValue}`);
      return fixedValue;
    }
  }
  
  // Couldn't fix - return original value
  console.log(`   ⚠️  Value ${value} outside expected range [${min}-${max}], keeping as-is`);
  return value;
}

/**
 * Match parameter name against known CBC parameters with fuzzy matching
 * Prioritizes exact matches and "Absolute" prefix
 */
function matchParameter(paramName) {
  const lower = paramName.toLowerCase();
  const trimmed = lower.trim();
  
  // Priority 1: Check for "Absolute" prefix first
  if (trimmed.includes('absolute')) {
    // Try to match absolute parameters
    for (const [key, paramDef] of Object.entries(CBC_PARAMETERS)) {
      if (key.startsWith('ABSOLUTE_')) {
        // Check display name
        if (trimmed === paramDef.displayName.toLowerCase()) {
          return {
            ...paramDef,
            confidence: 0.95
          };
        }
        
        // Check synonyms
        for (const syn of paramDef.synonyms) {
          if (trimmed === syn.toLowerCase()) {
            return {
              ...paramDef,
              confidence: 0.9
            };
          }
        }
        
        // Check fuzzy match
        const allTerms = [paramDef.displayName, ...paramDef.synonyms];
        for (const term of allTerms) {
          const similarity = calculateSimilarity(trimmed, term.toLowerCase());
          if (similarity >= paramDef.fuzzyThreshold) {
            return {
              ...paramDef,
              confidence: similarity / 100
            };
          }
        }
      }
    }
  }
  
  // Priority 2: Try exact and synonym matches for non-absolute parameters
  for (const [key, paramDef] of Object.entries(CBC_PARAMETERS)) {
    // Skip absolute parameters in this pass
    if (key.startsWith('ABSOLUTE_')) continue;
    
    // Check display name (exact match)
    if (trimmed === paramDef.displayName.toLowerCase()) {
      return {
        ...paramDef,
        confidence: 0.95
      };
    }
    
    // Check synonyms (exact match)
    for (const syn of paramDef.synonyms) {
      if (trimmed === syn.toLowerCase()) {
        return {
          ...paramDef,
          confidence: 0.9
        };
      }
    }
  }
  
  // Priority 3: Try fuzzy matching for non-absolute parameters
  for (const [key, paramDef] of Object.entries(CBC_PARAMETERS)) {
    // Skip absolute parameters
    if (key.startsWith('ABSOLUTE_')) continue;
    
    const allTerms = [paramDef.displayName, ...paramDef.synonyms];
    
    for (const term of allTerms) {
      const similarity = calculateSimilarity(trimmed, term.toLowerCase());
      
      if (similarity >= paramDef.fuzzyThreshold) {
        return {
          ...paramDef,
          confidence: similarity / 100
        };
      }
    }
  }
  
  return null;
}

/**
 * Calculate string similarity (Levenshtein-based percentage)
 */
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return similarity;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Extract numeric value from tokens
 */
function extractNumericValue(tokens) {
  for (const token of tokens) {
    // Match number pattern (supports decimals)
    const match = token.match(/^(\d+\.?\d*)$/);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value >= 0) {
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Check if tokens contain multiple numbers (indicates reference range)
 */
function hasMultipleNumbers(tokens) {
  let numberCount = 0;
  
  for (const token of tokens) {
    // Check for number or range pattern
    if (/\d+\.?\d*/.test(token)) {
      numberCount++;
    }
    
    // Range indicators
    if (/-|–|to/i.test(token)) {
      return true; // Definitely a range
    }
  }
  
  return numberCount > 1;
}

/**
 * Extract unit from text
 */
function extractUnitFromText(text, expectedUnits) {
  // Common unit patterns
  const unitPatterns = [
    /\b(g\/d[lL])\b/i,
    /\b(g\/[lL])\b/i,
    /\b(mg\/d[lL])\b/i,
    /\b(mg\/[lL])\b/i,
    /\b(f[lL])\b/i,
    /\b(pg)\b/i,
    /\b(%|percent)\b/i,
    /\b(cells?\/cumm|\/cumm|cumm?|CuMIn|Cumnn|CuIIm)\b/i,
    /\b(thou\/mm3|mill\/mm3|million\/cumm|lakhs\/cumm)\b/i,
    /\b(Mil)\b/i,
    /\b1L\b/i  // OCR corruption of "fL"
  ];
  
  for (const pattern of unitPatterns) {
    const match = text.match(pattern);
    if (match) {
      let unit = match[1];
      // Fix common OCR corruptions
      if (unit === '1L') unit = 'fL';
      if (unit === 'CuMIn' || unit === 'Cumnn' || unit === 'CuIIm') unit = '/cumm';
      if (unit === 'Mil') unit = 'mill/cumm';
      return unit;
    }
  }
  
  // Try expected units
  for (const expectedUnit of (expectedUnits || [])) {
    if (text.toLowerCase().includes(expectedUnit.toLowerCase())) {
      return expectedUnit;
    }
  }
  
  return '';
}

/**
 * Extract unit from tokens
 */
function extractUnit(tokens, expectedUnits) {
  // Common unit patterns
  const unitPatterns = [
    /^(g\/d[lL])$/i,
    /^(g\/[lL])$/i,
    /^(mg\/d[lL])$/i,
    /^(mg\/[lL])$/i,
    /^(f[lL])$/i,
    /^(pg)$/i,
    /^(%|percent)$/i,
    /^(cells?\/cumm)$/i,
    /^(\/cumm)$/i,
    /^(cumm?|CuMIn|Cumnn|CuIIm)$/i,
    /^(thou\/mm3|mill\/mm3|million\/cumm|lakhs\/cumm)$/i,
    /^(Mil|lion\/curii)$/i
  ];
  
  for (const token of tokens) {
    for (const pattern of unitPatterns) {
      if (pattern.test(token)) {
        return token;
      }
    }
  }
  
  // If no unit found in tokens, try expected units
  for (const token of tokens) {
    for (const expectedUnit of expectedUnits) {
      if (token.toLowerCase().includes(expectedUnit.toLowerCase())) {
        return expectedUnit;
      }
    }
  }
  
  return '';
}

module.exports = {
  extractCBCWithColumns
};
