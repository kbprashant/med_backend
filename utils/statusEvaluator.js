/**
 * Universal Status Evaluator
 * 
 * Evaluates parameter status for ALL lab test types:
 * - BLOOD_SUGAR, LFT, CBC, LIPID_PROFILE, KIDNEY_FUNCTION, THYROID, URINE, etc.
 * 
 * Handles:
 * - Numeric parameters with various reference range formats
 * - Qualitative parameters (NEGATIVE, POSITIVE, etc.)
 * - Mixed types
 * 
 * Returns: "NORMAL" | "HIGH" | "LOW" | "ABNORMAL"
 */

/**
 * Parse reference range string into min/max or comparison format
 * 
 * Supported formats:
 * - "70-110" → { type: 'range', min: 70, max: 110 }
 * - "70 - 110" → { type: 'range', min: 70, max: 110 }
 * - "<100" → { type: 'lessThan', limit: 100 }
 * - ">200" → { type: 'greaterThan', limit: 200 }
 * - "<=5" → { type: 'lessOrEqual', limit: 5 }
 * - ">=3" → { type: 'greaterOrEqual', limit: 3 }
 * - "NEGATIVE" → { type: 'qualitative', expected: 'NEGATIVE' }
 * 
 * @param {string} referenceRange - Reference range string
 * @returns {object|null} - Parsed range object or null
 */
function parseReferenceRange(referenceRange) {
  if (!referenceRange || typeof referenceRange !== 'string') {
    return null;
  }

  const trimmed = referenceRange.trim();
  
  // Handle empty or invalid ranges
  if (!trimmed || trimmed === '' || trimmed === '-') {
    return null;
  }

  // Check for range format: "70-110" or "70 - 110"
  // Match numbers with optional decimal points
  const rangeMatch = trimmed.match(/^([0-9.]+)\s*-\s*([0-9.]+)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    
    if (!isNaN(min) && !isNaN(max)) {
      return { type: 'range', min, max };
    }
  }

  // Check for less-than format: "<100" or "< 100"
  const lessThanMatch = trimmed.match(/^<\s*([0-9.]+)$/);
  if (lessThanMatch) {
    const limit = parseFloat(lessThanMatch[1]);
    if (!isNaN(limit)) {
      return { type: 'lessThan', limit };
    }
  }

  // Check for less-or-equal format: "<=5" or "<= 5"
  const lessOrEqualMatch = trimmed.match(/^<=\s*([0-9.]+)$/);
  if (lessOrEqualMatch) {
    const limit = parseFloat(lessOrEqualMatch[1]);
    if (!isNaN(limit)) {
      return { type: 'lessOrEqual', limit };
    }
  }

  // Check for greater-than format: ">200" or "> 200"
  const greaterThanMatch = trimmed.match(/^>\s*([0-9.]+)$/);
  if (greaterThanMatch) {
    const limit = parseFloat(greaterThanMatch[1]);
    if (!isNaN(limit)) {
      return { type: 'greaterThan', limit };
    }
  }

  // Check for greater-or-equal format: ">=3" or ">= 3"
  const greaterOrEqualMatch = trimmed.match(/^>=\s*([0-9.]+)$/);
  if (greaterOrEqualMatch) {
    const limit = parseFloat(greaterOrEqualMatch[1]);
    if (!isNaN(limit)) {
      return { type: 'greaterOrEqual', limit };
    }
  }

  // Check for qualitative reference (contains text, not just numbers)
  // Examples: "NEGATIVE", "CLEAR", "YELLOW", "NIL", "ABSENT"
  if (/[a-zA-Z]/.test(trimmed)) {
    return { type: 'qualitative', expected: trimmed.toUpperCase() };
  }

  // Could not parse
  return null;
}

/**
 * Evaluate numeric parameter status
 * 
 * @param {number} numericValue - Numeric value
 * @param {object} parsedRange - Parsed reference range
 * @returns {string} - "NORMAL" | "HIGH" | "LOW"
 */
function evaluateNumericStatus(numericValue, parsedRange) {
  if (!parsedRange || numericValue === null || numericValue === undefined || isNaN(numericValue)) {
    return 'NORMAL';
  }

  switch (parsedRange.type) {
    case 'range':
      // Standard range: min-max
      if (numericValue < parsedRange.min) {
        return 'LOW';
      } else if (numericValue > parsedRange.max) {
        return 'HIGH';
      } else {
        return 'NORMAL';
      }

    case 'lessThan':
      // <limit format (e.g., "<100")
      // If value is >= limit, it's HIGH
      if (numericValue >= parsedRange.limit) {
        return 'HIGH';
      } else {
        return 'NORMAL';
      }

    case 'lessOrEqual':
      // <=limit format (e.g., "<=5")
      // If value is > limit, it's HIGH
      if (numericValue > parsedRange.limit) {
        return 'HIGH';
      } else {
        return 'NORMAL';
      }

    case 'greaterThan':
      // >limit format (e.g., ">200")
      // If value is <= limit, it's LOW
      if (numericValue <= parsedRange.limit) {
        return 'LOW';
      } else {
        return 'NORMAL';
      }

    case 'greaterOrEqual':
      // >=limit format (e.g., ">=3")
      // If value is < limit, it's LOW
      if (numericValue < parsedRange.limit) {
        return 'LOW';
      } else {
        return 'NORMAL';
      }

    default:
      return 'NORMAL';
  }
}

/**
 * Evaluate qualitative parameter status
 * 
 * @param {string} value - Actual value (e.g., "POSITIVE", "++", "TRACE")
 * @param {object} parsedRange - Parsed reference range
 * @returns {string} - "NORMAL" | "ABNORMAL"
 */
function evaluateQualitativeStatus(value, parsedRange) {
  if (!value || !parsedRange || parsedRange.type !== 'qualitative') {
    return 'NORMAL';
  }

  const upperValue = String(value).toUpperCase().trim();
  const expected = parsedRange.expected;

  // Check for exact match
  if (upperValue === expected) {
    return 'NORMAL';
  }

  // Special handling for NEGATIVE reference
  // Any value that's not NEGATIVE/NIL/ABSENT is abnormal
  if (expected === 'NEGATIVE') {
    const normalVariants = ['NEGATIVE', 'NEG', 'NIL', 'ABSENT', 'NOT SEEN', 'NOTPRESENT', 'NOT PRESENT'];
    if (normalVariants.includes(upperValue)) {
      return 'NORMAL';
    } else {
      return 'ABNORMAL';
    }
  }

  // For other qualitative values like "CLEAR", "YELLOW", etc.
  // Check for partial match (e.g., "PALE YELLOW" should match "YELLOW")
  if (upperValue.includes(expected) || expected.includes(upperValue)) {
    return 'NORMAL';
  }

  // Value doesn't match expected
  return 'ABNORMAL';
}

/**
 * Main function: Evaluate parameter status universally
 * 
 * Works for ALL test types (BLOOD_SUGAR, CBC, LFT, LIPID_PROFILE, etc.)
 * 
 * @param {object} param - Parameter object with:
 *   - parameter: string (parameter name)
 *   - value: number | string (actual value)
 *   - unit: string (optional)
 *   - referenceRange: string (optional, e.g., "70-110" or "NEGATIVE")
 *   - status: string (optional, existing status to preserve if already computed)
 * @returns {string} - "NORMAL" | "HIGH" | "LOW" | "ABNORMAL"
 */
function evaluateParameterStatus(param) {
  // If status is already set (e.g., from STRICT extraction for URINE), preserve it
  // BUT only if it's a valid status value
  if (param.status && typeof param.status === 'string') {
    const upperStatus = param.status.toUpperCase();
    if (['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'BORDERLINE'].includes(upperStatus)) {
      // Map "BORDERLINE" to "ABNORMAL" for consistency
      return upperStatus === 'BORDERLINE' ? 'ABNORMAL' : upperStatus;
    }
  }

  // No reference range available - return NORMAL as safe default
  if (!param.referenceRange) {
    return 'NORMAL';
  }

  // Parse reference range
  const parsedRange = parseReferenceRange(param.referenceRange);
  
  // Could not parse reference range - return NORMAL
  if (!parsedRange) {
    return 'NORMAL';
  }

  // Determine if value is numeric
  const numericValue = parseFloat(param.value);
  const isNumeric = !isNaN(numericValue);

  // Handle numeric parameters
  if (isNumeric && parsedRange.type !== 'qualitative') {
    return evaluateNumericStatus(numericValue, parsedRange);
  }

  // Handle qualitative parameters
  if (parsedRange.type === 'qualitative') {
    return evaluateQualitativeStatus(param.value, parsedRange);
  }

  // Mixed case: value is text but range is numeric (should rarely happen)
  // Or value is numeric but range is qualitative (also rare)
  // Default to NORMAL
  return 'NORMAL';
}

module.exports = {
  evaluateParameterStatus,
  parseReferenceRange,
  evaluateNumericStatus,
  evaluateQualitativeStatus
};
