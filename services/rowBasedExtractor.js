/**
 * Row-Based Extraction Helper
 * 
 * Extracts values from the same row or structured columns
 * Instead of using word proximity, this extracts based on row structure:
 * 
 * Example Table Format:
 * PARAMETER    | RESULT  | UNIT   | REFERENCE
 * Glucose      | 138     | mg/dL  | 70-100
 * 
 * This ensures we don't extract values from different rows or random text.
 */

const { isStrictlyNumeric } = require('./strictValidator');

/**
 * Split OCR text into structured rows
 * @param {string} ocrText - Raw OCR text
 * @returns {Array} - Array of row objects
 */
function splitIntoRows(ocrText) {
  if (!ocrText) return [];
  
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    text: line,
    tokens: tokenizeLine(line)
  }));
}

/**
 * Tokenize a line into words/numbers
 * @param {string} line - Single line of text
 * @returns {Array} - Array of tokens with positions
 */
function tokenizeLine(line) {
  if (!line) return [];
  
  // Split by whitespace but keep track of positions
  const tokens = [];
  const words = line.split(/\s+/);
  
  let position = 0;
  for (const word of words) {
    if (word.trim().length > 0) {
      tokens.push({
        text: word.trim(),
        position: position,
        isNumeric: isStrictlyNumeric(word.trim())
      });
      position++;
    }
  }
  
  return tokens;
}

/**
 * Detect if OCR text has a structured table format
 * Looks for header rows with columns like "PARAMETER", "RESULT", "VALUE", "UNIT"
 * 
 * @param {string} ocrText - Raw OCR text
 * @returns {object} - { isStructured, headerRow, resultColumnIndex, unitColumnIndex }
 */
function detectTableStructure(ocrText) {
  const rows = splitIntoRows(ocrText);
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const lowerLine = row.text.toLowerCase();
    
    // Look for header keywords
    const hasParameterColumn = /\b(test|parameter|investigation|exam)\b/.test(lowerLine);
    const hasResultColumn = /\b(result|value|observed|findings)\b/.test(lowerLine);
    const hasUnitColumn = /\b(unit|units)\b/.test(lowerLine);
    
    if (hasParameterColumn && hasResultColumn) {
      // Found a structured table header
      const tokens = row.tokens;
      let resultColumnIndex = -1;
      let unitColumnIndex = -1;
      
      // Find column positions
      for (let j = 0; j < tokens.length; j++) {
        const tokenLower = tokens[j].text.toLowerCase();
        if (/^(result|value|observed|findings)$/.test(tokenLower)) {
          resultColumnIndex = j;
        }
        if (/^(unit|units)$/.test(tokenLower)) {
          unitColumnIndex = j;
        }
      }
      
      return {
        isStructured: true,
        headerRow: i,
        resultColumnIndex: resultColumnIndex,
        unitColumnIndex: unitColumnIndex,
        headerText: row.text
      };
    }
  }
  
  return {
    isStructured: false,
    headerRow: -1,
    resultColumnIndex: -1,
    unitColumnIndex: -1
  };
}

/**
 * Check if a value is likely a reference value (not a result)
 * Reference values are often preceded by comparison operators or contextual keywords
 * @param {string} fullText - Full text of the row
 * @param {string} value - The numeric value to check
 * @returns {boolean} - True if likely a reference value
 */
function isLikelyReferenceValue(fullText, value) {
  if (!fullText || !value) return false;
  
  const lowerText = fullText.toLowerCase();
  
  // Check if value is preceded by comparison operators (strong indicator of reference)
  const comparisonPatterns = [
    new RegExp(`[<>≤≥]\\s*${value}`, 'i'),  // < 150, > 40, etc.
    new RegExp(`${value}\\s*[-–—]\\s*[\\d.]+`, 'i'),  // Range: 125-200
    new RegExp(`[\\d.]+\\s*[-–—]\\s*${value}`, 'i'),  // Range: 70-100
  ];
  
  for (const pattern of comparisonPatterns) {
    if (pattern.test(fullText)) {
      return true;
    }
  }
  
  // Check if row contains reference/normal keywords
  const referenceKeywords = [
    'reference value', 'reference range', 'normal range', 'normal value',
    'ref range', 'ref value', 'biological reference'
  ];
  
  for (const keyword of referenceKeywords) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the best numeric value in a row (prefer result over reference)
 * Enhanced to concatenate split digits (e.g., "12 4" → "124")
 * @param {Array} tokens - Array of tokens from the row
 * @param {string} fullRowText - Full text of the row
 * @returns {object|null} - { value, unit } or null
 */
function findBestNumericValue(tokens, fullRowText) {
  if (!tokens || tokens.length === 0) return null;
  
  // Step 1: Merge consecutive single-digit numeric tokens (OCR splitting issue)
  // Example: "12 4" becomes "124"
  const mergedTokens = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.isNumeric && token.text.length <= 2) {
      // Check if next token is also a single digit
      let mergedValue = token.text;
      let j = i + 1;
      
      // Look ahead for consecutive single-digit numbers
      while (j < tokens.length && 
             tokens[j].isNumeric && 
             tokens[j].text.length <= 2 &&
             j - i <= 2) {  // Max 2 lookahead (e.g., "1 2 4" → "124")
        // Stop if we hit a range pattern (e.g., "60-110")
        if (tokens[j].text.includes('-')) break;
        
        mergedValue += tokens[j].text;
        j++;
      }
      
      // If we merged multiple tokens, use the merged value
      if (j > i + 1) {
        mergedTokens.push({
          text: mergedValue,
          position: token.position,
          isNumeric: true
        });
        i = j;  // Skip the merged tokens
        continue;
      }
    }
    
    mergedTokens.push(token);
    i++;
  }
  
  // SPECIAL CASE: Detect pattern "Result < Reference" or "Result > Reference"
  // This is common in lipid profiles: "HDL Cholesterol 40 > 35.00 mg/dL"
  // The value BEFORE the operator is the result, value AFTER is reference
  for (let i = 0; i < mergedTokens.length - 2; i++) {
    const token = mergedTokens[i];
    const nextToken = mergedTokens[i + 1];
    const afterNext = mergedTokens[i + 2];
    
    // Check for pattern: [Numeric] [</>] [Numeric]
    if (token.isNumeric && /^[<>≤≥]$/.test(nextToken.text) && afterNext.isNumeric) {
      // The first number is the result, second is reference
      // Look for unit after the reference
      let unit = '';
      if (i + 3 < mergedTokens.length && isValidUnit(mergedTokens[i + 3].text)) {
        unit = mergedTokens[i + 3].text;
      }
      
      console.log(`   🎯 Detected Result-Operator-Reference pattern: ${token.text} ${nextToken.text} ${afterNext.text} ${unit}`);
      return { 
        value: token.text, 
        unit: unit,
        referenceRange: `${nextToken.text}${afterNext.text}`
      };
    }
  }
  
  // Step 2: Collect all numeric values with context
  const numericCandidates = [];
  
  for (let i = 0; i < mergedTokens.length; i++) {
    const token = mergedTokens[i];
    if (token.isNumeric) {
      // Get surrounding context (previous and next tokens)
      const prevToken = i > 0 ? mergedTokens[i - 1].text : '';
      const nextToken = i < mergedTokens.length - 1 ? mergedTokens[i + 1].text : '';
      
      // Check if preceded by comparison operator (strong indicator of reference)
      const isPrecededByOperator = /^[<>≤≥c]$/i.test(prevToken);
      
      // Check if followed by comparison operator (could be result)
      const isFollowedByOperator = /^[<>≤≥]$/.test(nextToken);
      
      // Check if part of range (e.g., "125-200" or "125 - 200")
      const isPartOfRange = /^[-–—]$/.test(prevToken) || /^[-–—]$/.test(nextToken) || token.text.includes('-');
      
      // Check if likely a reference based on full context
      const isReference = isLikelyReferenceValue(fullRowText, token.text);
      
      numericCandidates.push({
        value: token.text,
        position: i,
        isPrecededByOperator,
        isFollowedByOperator,
        isPartOfRange,
        isReference,
        nextToken
      });
    }
  }
  
  if (numericCandidates.length === 0) return null;
  
  // Scoring system: prefer values that are NOT references
  let bestCandidate = null;
  let bestScore = -1;
  
  for (const candidate of numericCandidates) {
    let score = 10; // Base score
    
    // STRONG penalties for reference indicators
    if (candidate.isPrecededByOperator) score -= 8; // Value AFTER < or > is reference
    if (candidate.isPartOfRange) score -= 5;
    if (candidate.isReference) score -= 7;
    
    // BONUS if value is followed by operator (likely a result)
    if (candidate.isFollowedByOperator) score += 5;
    
    // Bonus for having a unit after it
    if (isValidUnit(candidate.nextToken)) score += 2;
    
    // Prefer earlier values (results usually come before references)
    score -= candidate.position * 0.1;
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }
  
  // If best candidate is clearly a reference (negative score), return null
  // This prevents extracting reference values when no valid result is found
  if (bestCandidate && bestScore <= 2) {
    console.log(`   ⚠️  Best candidate "${bestCandidate.value}" appears to be a reference value (score: ${bestScore}), skipping extraction`);
    return null;
  }
  
  if (bestCandidate) {
    let unit = '';
    if (isValidUnit(bestCandidate.nextToken)) {
      unit = bestCandidate.nextToken;
    }
    return { value: bestCandidate.value, unit };
  }
  
  return null;
}

/**
 * Extract value from the same row as parameter (structured table)
 * 
 * @param {Array} rows - Array of row objects from splitIntoRows()
 * @param {number} parameterRowIndex - Index of row containing parameter name
 * @param {number} resultColumnIndex - Column index where results are located
 * @param {number} unitColumnIndex - Column index where units are located
 * @returns {object|null} - { value, unit } or null
 */
function extractValueFromSameRow(rows, parameterRowIndex, resultColumnIndex, unitColumnIndex) {
  if (parameterRowIndex < 0 || parameterRowIndex >= rows.length) {
    return null;
  }
  
  const row = rows[parameterRowIndex];
  const tokens = row.tokens;
  const fullRowText = row.text;
  
  let value = null;
  let unit = null;
  
  // Try to extract from result column
  if (resultColumnIndex >= 0 && resultColumnIndex < tokens.length) {
    const resultToken = tokens[resultColumnIndex];
    if (resultToken.isNumeric) {
      // Verify it's not a reference value
      if (!isLikelyReferenceValue(fullRowText, resultToken.text)) {
        value = resultToken.text;
      }
    }
  }
  
  // Try to extract from unit column
  if (unitColumnIndex >= 0 && unitColumnIndex < tokens.length) {
    unit = tokens[unitColumnIndex].text;
  }
  
  // If column-based extraction failed, use smart value finding
  if (!value) {
    const bestValue = findBestNumericValue(tokens, fullRowText);
    if (bestValue) {
      value = bestValue.value;
      unit = unit || bestValue.unit;
    }
  }
  
  // If still no value, check next line (sometimes values are on next line)
  if (!value && parameterRowIndex + 1 < rows.length) {
    const nextRow = rows[parameterRowIndex + 1];
    const nextBestValue = findBestNumericValue(nextRow.tokens, nextRow.text);
    
    if (nextBestValue) {
      value = nextBestValue.value;
      unit = unit || nextBestValue.unit;
    }
  }
  
  return value ? { value, unit: unit || '' } : null;
}

/**
 * Check if a token is a valid medical unit
 * @param {string} token - Token to check
 * @returns {boolean} - True if valid unit
 */
function isValidUnit(token) {
  if (!token) return false;
  
  const lowerToken = token.toLowerCase();
  
  const validUnits = [
    'mg/dl', 'g/dl', 'mmol/l', 'u/l', 'iu/l', 'miu/ml', 'µiu/ml', 'uiu/ml',
    'ng/ml', 'pg/ml', 'ng/dl', 'pg/dl', 'µg/dl', 'ug/dl',
    'cells/µl', 'million/µl', 'thousand/µl', 'lakhs/µl',
    'fl', 'pg', '%', 'mmhg', 'bpm', 'sec', 'seconds', 'mm/hr',
    'meq/l', 'µmol/l', 'umol/l', 'pmol/l',
    'mg/l', 'g/l', 'ml/min', 'kg', 'cm', 'mm'
  ];
  
  return validUnits.some(unit => lowerToken.includes(unit) || unit.includes(lowerToken));
}

/**
 * Extract value from key-value format (same line)
 * Format: "Parameter Name: Value Unit"
 * Example: "Fasting Blood Sugar: 138 mg/dL"
 * 
 * @param {string} line - Single line of text
 * @returns {object|null} - { parameter, value, unit } or null
 */
function extractFromKeyValueLine(line) {
  if (!line || typeof line !== 'string') {
    return null;
  }
  
  // Skip lines that are clearly reference range descriptions
  if (isLikelyReferenceValue(line, '')) {
    return null;
  }
  
  // Pattern: Parameter : Value Unit
  // or: Parameter Value Unit
  // Enhanced to handle special characters like {, [, (, etc.
  const patterns = [
    // With parentheses/braces: "{Blood sugar{(Fasting) 138 mg/dl"
    /[{[\(]?\s*([A-Za-z][A-Za-z\s()]+?)[})\]]*\s+(\d+\.?\d*)\s+([a-zA-Z/%µ]+)/,
    // With colon separator (but not preceded by comparison operators)
    /^(.+?)\s*:\s*([\d.]+)\s*([a-zA-Z/%µ]+)?/,
    // With multiple spaces (table-like)
    /^([A-Za-z][A-Za-z\s()]+?)\s{2,}([\d.]+)\s+([a-zA-Z/%µ]+)?/,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      let parameter = match[1].trim();
      const value = match[2].trim();
      const unit = match[3] ? match[3].trim() : '';
      
      // Clean up parameter name: remove leading/trailing special characters
      parameter = parameter.replace(/^[{[\(]+|[})\]]+$/g, '').trim();
      
      // Check if value is preceded by comparison operator (reference indicator)
      if (/[<>≤≥]\s*$/.test(parameter)) {
        continue; // Skip this match, it's a reference value
      }
      
      // Check if the value itself is likely a reference
      if (isLikelyReferenceValue(line, value)) {
        continue; // Skip this match
      }
      
      // Validate that we have both parameter and numeric value
      if (parameter.length > 1 && isStrictlyNumeric(value)) {
        return {
          parameter,
          value,
          unit,
          extractionMethod: 'key-value'
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract from structured table format
 * Scans for parameter names and extracts values from the same row
 * 
 * @param {string} ocrText - Raw OCR text
 * @param {Array} knownParameters - Array of known parameter names to look for
 * @returns {Array} - Array of extraction results
 */
function extractFromStructuredTable(ocrText, knownParameters = []) {
  const rows = splitIntoRows(ocrText);
  const structure = detectTableStructure(ocrText);
  
  const results = [];
  
  // Sort known parameters by length (longest first) to match more specific parameters first
  // Example: "VLDL Cholesterol" should match before "Cholesterol"
  //          "HDL Cholesterol" should match before "HDL"
  const sortedParameters = [...knownParameters].sort((a, b) => b.length - a.length);
  
  // Start searching after header row
  const startRow = structure.isStructured ? structure.headerRow + 1 : 0;
  
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    
    // Try key-value extraction first (easier and more reliable)
    const kvResult = extractFromKeyValueLine(row.text);
    if (kvResult) {
      results.push(kvResult);
      continue;
    }
    
    // Try to match known parameters (longest first for specificity)
    for (const knownParam of sortedParameters) {
      const lowerRowText = row.text.toLowerCase();
      const lowerParam = knownParam.toLowerCase();
      
      if (lowerRowText.includes(lowerParam)) {
        // Found a parameter, extract value from same row
        const extraction = extractValueFromSameRow(
          rows, 
          i, 
          structure.resultColumnIndex,
          structure.unitColumnIndex
        );
        
        if (extraction && extraction.value) {
          results.push({
            parameter: knownParam,
            value: extraction.value,
            unit: extraction.unit || '',
            extractionMethod: 'structured-table',
            lineNumber: row.lineNumber
          });
          break; // Don't match this row to multiple parameters
        }
      }
    }
  }
  
  return results;
}

/**
 * Main row-based extraction function
 * @param {string} ocrText - Raw OCR text
 * @param {Array} knownParameters - Array of known parameter names
 * @returns {Array} - Extracted results
 */
function extractRowBased(ocrText, knownParameters = []) {
  console.log(`\n🔍 ROW-BASED EXTRACTION STARTED`);
  console.log(`   OCR Text Length: ${ocrText ? ocrText.length : 0} chars`);
  console.log(`   Known Parameters: ${knownParameters.length}`);
  
  const results = extractFromStructuredTable(ocrText, knownParameters);
  
  console.log(`   ✅ Extracted: ${results.length} parameters\n`);
  
  return results;
}

module.exports = {
  splitIntoRows,
  tokenizeLine,
  detectTableStructure,
  isLikelyReferenceValue,
  findBestNumericValue,
  extractValueFromSameRow,
  extractFromKeyValueLine,
  extractFromStructuredTable,
  extractRowBased,
  isValidUnit,
};
