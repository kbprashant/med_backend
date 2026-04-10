/**
 * Label-Based Extractor Service
 * 
 * Extracts parameter values using LABEL-BASED search (NOT position/order-based).
 * For each parameter:
 * 1. Find the parameter label in OCR text
 * 2. Extract the FIRST numeric value immediately after the label
 * 3. Stop at unit or reference range
 * 4. Validate the extracted value
 */

class LabelBasedExtractor {
  /**
   * Extract all parameters for a given report type
   * @param {string} ocrText - Raw OCR text
   * @param {object} parameterDefinitions - Parameter definitions from config
   * @returns {array} - Array of extracted parameters
   */
  extractParameters(ocrText, parameterDefinitions) {
    if (!ocrText || !parameterDefinitions) {
      return [];
    }

    const lines = ocrText.split('\n').map(line => line.trim());
    const results = [];

    console.log(`\n🔍 Extracting ${parameterDefinitions.parameters.length} parameters...`);

    for (const paramDef of parameterDefinitions.parameters) {
      const extracted = this.extractSingleParameter(lines, ocrText, paramDef);
      
      if (extracted) {
        results.push({
          parameter: paramDef.name,
          value: extracted.value,
          unit: paramDef.unit,
          status: this.calculateStatus(extracted.value, paramDef.referenceRange),
          referenceRange: `${paramDef.referenceRange.min}-${paramDef.referenceRange.max}`,
          extractionMethod: extracted.method
        });
        console.log(`   ✅ ${paramDef.name}: ${extracted.value} ${paramDef.unit}`);
      } else {
        // Parameter not found - return null instead of wrong value
        results.push({
          parameter: paramDef.name,
          value: null,
          unit: paramDef.unit,
          status: 'Unknown',
          referenceRange: `${paramDef.referenceRange.min}-${paramDef.referenceRange.max}`,
          extractionMethod: 'not_found'
        });
        console.log(`   ⚠️  ${paramDef.name}: Not found`);
      }
    }

    return results;
  }

  /**
   * Extract a single parameter value using label-based search
   * @param {array} lines - OCR text split into lines
   * @param {string} fullText - Full OCR text
   * @param {object} paramDef - Parameter definition
   * @returns {object|null} - Extracted value and method
   */
  extractSingleParameter(lines, fullText, paramDef) {
    // Try each alias for this parameter
    for (const alias of paramDef.aliases) {
      // Strategy 0: Column-based table extraction (for TEST/RESULT column format)
      const columnResult = this.searchInColumns(lines, alias, paramDef);
      if (columnResult) {
        return { value: columnResult, method: 'column_search' };
      }

      // Strategy 1: Line-by-line search (most accurate)
      const lineResult = this.searchInLines(lines, alias, paramDef);
      if (lineResult) {
        return { value: lineResult, method: 'line_search' };
      }

      // Strategy 2: Context window search (for multi-line formats)
      const contextResult = this.searchWithContext(fullText, alias, paramDef);
      if (contextResult) {
        return { value: contextResult, method: 'context_search' };
      }
    }

    return null;
  }

  /**
   * Search for parameter value in column-based table format
   * Handles reports where TEST names are in one column and RESULT values in another
   * @param {array} lines - OCR lines
   * @param {string} label - Parameter label/alias
   * @param {object} paramDef - Parameter definition
   * @returns {number|null} - Extracted value
   */
  searchInColumns(lines, label, paramDef) {
    const lowerLabel = label.toLowerCase();
    
    // Find the line with the parameter label
    let parameterLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const lowerLine = lines[i].toLowerCase();
      const hasLabel = label.length <= 2 
        ? new RegExp(`\\b${lowerLabel}\\b`, 'i').test(lowerLine)
        : lowerLine.includes(lowerLabel);
      
      if (hasLabel) {
        parameterLineIndex = i;
        break;
      }
    }
    
    if (parameterLineIndex === -1) return null;
    
    // Strategy: In column-based reports, the parameter label and value are separated
    // Look for "RESULT" header to understand the column structure
    let resultColumnStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^(RESULT|VALUE|OBSERVED)$/i.test(lines[i].trim())) {
        resultColumnStart = i + 1; // Values start after the header
        break;
      }
    }
    
    if (resultColumnStart === -1) return null;
    
    // Simple strategy: Distance from parameter to RESULT header = Distance from RESULT header to value
    // Example: "Blood sugar(Fasting)" at line 7, RESULT at line 17, distance = 10
    // So value is at line 17 + 10 = 27? No, that's wrong.
    // Better: Count numeric lines between parameter and RESULT, that's the offset
    const distanceToResult = resultColumnStart - parameterLineIndex - 1;
    
    // Get the value at the same relative position after RESULT
    // Collect all numeric value lines after RESULT
    const valueLines = [];
    for (let i = resultColumnStart; i < Math.min(resultColumnStart + 20, lines.length); i++) {
      const line = lines[i].trim();
      // Only pure numeric lines (to avoid phone numbers, dates, etc.)
      if (/^\d+(\.\d+)?$/.test(line)) {
        const num = parseFloat(line);
        if (!isNaN(num) && num > 0) {
          valueLines.push({ line: i, value: num });
        }
      }
    }
    
    if (valueLines.length === 0) return null;
    
    // Now count how many TEST parameters (not sub-parameters) appear before our target
    // Only count lines that look like main test names (contain "sugar", "pressure", etc.)
    let position = 0;
    const testPatterns = /blood|sugar|glucose|pressure|cholesterol|hemoglobin|creatinine|urea|thyroid|triglyceride/i;
    
    for (let i = 0; i < parameterLineIndex; i++) {
      const line = lines[i];
      // Count only lines that look like main test parameters
      if (testPatterns.test(line)) {
        position++;
      }
    }
    
    // Get the value at this position
    if (position < valueLines.length) {
      const foundValue = valueLines[position].value;
      if (this.isValueReasonable(foundValue, paramDef.referenceRange)) {
        return foundValue;
      }
    }
    
    return null;
  }

  /**
   * Search for parameter in individual lines
   * @param {array} lines - OCR lines
   * @param {string} label - Parameter label/alias
   * @param {object} paramDef - Parameter definition
   * @returns {number|null} - Extracted value
   */
  searchInLines(lines, label, paramDef) {
    const lowerLabel = label.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check if this line contains the parameter label
      // Use word boundary for short parameters like "K", "Na", "Cl"
      const hasLabel = label.length <= 2 
        ? new RegExp(`\\b${lowerLabel}\\b`, 'i').test(lowerLine)
        : lowerLine.includes(lowerLabel);

      if (hasLabel) {
        // Find position of label
        const labelIndex = lowerLine.indexOf(lowerLabel);
        
        // Get text AFTER the label
        const textAfterLabel = line.substring(labelIndex + label.length);
        
        // Extract first number after the label
        const value = this.extractFirstNumber(textAfterLabel, paramDef);
        
        if (value !== null && this.isValueReasonable(value, paramDef.referenceRange)) {
          return value;
        }

        // If not found in same line, check next line
        if (i + 1 < lines.length) {
          const nextLineValue = this.extractFirstNumber(lines[i + 1], paramDef);
          if (nextLineValue !== null && this.isValueReasonable(nextLineValue, paramDef.referenceRange)) {
            return nextLineValue;
          }
        }
      }
    }

    return null;
  }

  /**
   * Search with context window (for scattered formats)
   * @param {string} text - Full OCR text
   * @param {string} label - Parameter label
   * @param {object} paramDef - Parameter definition
   * @returns {number|null} - Extracted value
   */
  searchWithContext(text, label, paramDef) {
    const lowerText = text.toLowerCase();
    const lowerLabel = label.toLowerCase();

    const labelIndex = lowerText.indexOf(lowerLabel);
    if (labelIndex === -1) return null;

    // Get context (next 100 characters after label)
    const context = text.substring(labelIndex + label.length, labelIndex + label.length + 100);
    
    const value = this.extractFirstNumber(context, paramDef);
    
    if (value !== null && this.isValueReasonable(value, paramDef.referenceRange)) {
      return value;
    }

    return null;
  }

  /**
   * Extract the FIRST numeric value from text
   * This is the key function that prevents extracting reference ranges
   * @param {string} text - Text to search
   * @param {object} paramDef - Parameter definition (for validation)
   * @returns {number|null} - Extracted number
   */
  extractFirstNumber(text, paramDef) {
    // Remove common noise patterns first
    let cleanText = text
      .replace(/reference|range|normal|ref/gi, '') // Remove range indicators
      .replace(/\([^)]*\)/g, ''); // Remove parentheses content

    // Pattern to match numbers (including decimals)
    // Matches: 138, 138.5, 13.8, etc.
    const numberPattern = /(\d+\.?\d*)/g;
    
    const matches = [];
    let match;
    
    while ((match = numberPattern.exec(cleanText)) !== null) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) {
        matches.push({
          value: num,
          position: match.index
        });
      }
    }

    if (matches.length === 0) return null;

    // Return the FIRST number found (most likely the actual value)
    const firstNumber = matches[0].value;

    // Additional validation: if first number seems unreasonable,
    // try the second number (in case of formatting issues)
    if (matches.length > 1 && !this.isValueReasonable(firstNumber, paramDef.referenceRange)) {
      const secondNumber = matches[1].value;
      if (this.isValueReasonable(secondNumber, paramDef.referenceRange)) {
        return secondNumber;
      }
    }

    return firstNumber;
  }

  /**
   * Check if extracted value is reasonable (within 10x tolerance of reference range)
   * Helps prevent extracting wrong numbers
   * @param {number} value - Extracted value
   * @param {object} range - Reference range {min, max}
   * @returns {boolean} - True if reasonable
   */
  isValueReasonable(value, range) {
    const tolerance = 10; // Allow 10x tolerance for abnormal values
    return value >= (range.min / tolerance) && value <= (range.max * tolerance);
  }

  /**
   * Calculate status based on reference range
   * @param {number} value - Parameter value
   * @param {object} range - Reference range {min, max}
   * @returns {string} - 'Normal', 'High', 'Low', or 'Unknown'
   */
  calculateStatus(value, range) {
    if (value === null || value === undefined) return 'Unknown';
    
    if (value < range.min) return 'Low';
    if (value > range.max) return 'High';
    return 'Normal';
  }
}

// Singleton instance
module.exports = new LabelBasedExtractor();
