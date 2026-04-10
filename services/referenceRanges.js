/**
 * Medical Reference Ranges Database
 * 
 * Defines normal ranges for common medical parameters
 * Works with NORMALIZED parameter names from normalizer.js
 */

/**
 * Reference ranges for common medical parameters
 * Each entry has: min, max, unit, criticalLow, criticalHigh
 */
const REFERENCE_RANGES = {
  // ═══════════════════════════════════════════════════════════════
  // GLUCOSE / BLOOD SUGAR
  // ═══════════════════════════════════════════════════════════════
  'Fasting Glucose': {
    unit: 'mg/dL',
    min: 70,
    max: 110,
    criticalLow: 50,
    criticalHigh: 200,
    description: 'Fasting blood glucose'
  },
  'Postprandial Glucose': {
    unit: 'mg/dL',
    min: 80,
    max: 140,
    criticalLow: 60,
    criticalHigh: 250,
    description: 'Post-meal blood glucose'
  },
  'Random Glucose': {
    unit: 'mg/dL',
    min: 70,
    max: 140,
    criticalLow: 50,
    criticalHigh: 200,
    description: 'Random blood glucose'
  },
  'HbA1c': {
    unit: '%',
    min: 4.0,
    max: 6.0,
    criticalLow: 3.0,
    criticalHigh: 9.0,
    description: 'Glycated hemoglobin'
  },

  // ═══════════════════════════════════════════════════════════════
  // BLOOD PRESSURE
  // ═══════════════════════════════════════════════════════════════
  'Blood Pressure Systolic': {
    unit: 'mm Hg',
    min: 90,
    max: 120,
    criticalLow: 70,
    criticalHigh: 180,
    description: 'Systolic blood pressure'
  },
  'Blood Pressure Diastolic': {
    unit: 'mm Hg',
    min: 60,
    max: 80,
    criticalLow: 40,
    criticalHigh: 110,
    description: 'Diastolic blood pressure'
  },

  // ═══════════════════════════════════════════════════════════════
  // VITAL SIGNS
  // ═══════════════════════════════════════════════════════════════
  'Pulse': {
    unit: 'per/min',
    min: 60,
    max: 100,
    criticalLow: 40,
    criticalHigh: 140,
    description: 'Heart rate'
  },
  'Temperature': {
    unit: '°F',
    min: 97.0,
    max: 99.0,
    criticalLow: 95.0,
    criticalHigh: 103.0,
    description: 'Body temperature'
  },
  'Respiratory Rate': {
    unit: 'per/min',
    min: 12,
    max: 20,
    criticalLow: 8,
    criticalHigh: 30,
    description: 'Breaths per minute'
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPLETE BLOOD COUNT (CBC)
  // ═══════════════════════════════════════════════════════════════
  'Hemoglobin': {
    unit: 'g/dL',
    min: 12.0,
    max: 16.0,
    criticalLow: 7.0,
    criticalHigh: 20.0,
    description: 'Hemoglobin level',
    gender: {
      male: { min: 13.5, max: 17.5 },
      female: { min: 12.0, max: 15.5 }
    }
  },
  'RBC Count': {
    unit: 'cells/cumm',
    min: 4.5e6,
    max: 5.5e6,
    criticalLow: 3.0e6,
    criticalHigh: 7.0e6,
    description: 'Red blood cell count',
    gender: {
      male: { min: 4.5e6, max: 5.9e6 },
      female: { min: 4.1e6, max: 5.1e6 }
    }
  },
  'WBC Count': {
    unit: 'cells/cumm',
    min: 4000,
    max: 11000,
    criticalLow: 2000,
    criticalHigh: 25000,
    description: 'White blood cell count'
  },
  'Platelet Count': {
    unit: 'cells/cumm',
    min: 150000,
    max: 400000,
    criticalLow: 50000,
    criticalHigh: 1000000,
    description: 'Platelet count'
  },
  'Hematocrit': {
    unit: '%',
    min: 36,
    max: 46,
    criticalLow: 25,
    criticalHigh: 60,
    description: 'Hematocrit / PCV',
    gender: {
      male: { min: 40, max: 50 },
      female: { min: 36, max: 44 }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LIPID PROFILE
  // ═══════════════════════════════════════════════════════════════
  'Total Cholesterol': {
    unit: 'mg/dL',
    min: 0,
    max: 200,
    criticalLow: 0,
    criticalHigh: 300,
    description: 'Total cholesterol'
  },
  'HDL Cholesterol': {
    unit: 'mg/dL',
    min: 40,
    max: 200,
    criticalLow: 20,
    criticalHigh: 100,
    description: 'High-density lipoprotein (good cholesterol)'
  },
  'LDL Cholesterol': {
    unit: 'mg/dL',
    min: 0,
    max: 100,
    criticalLow: 0,
    criticalHigh: 190,
    description: 'Low-density lipoprotein (bad cholesterol)'
  },
  'Triglycerides': {
    unit: 'mg/dL',
    min: 0,
    max: 150,
    criticalLow: 0,
    criticalHigh: 500,
    description: 'Triglycerides'
  },

  // ═══════════════════════════════════════════════════════════════
  // KIDNEY FUNCTION
  // ═══════════════════════════════════════════════════════════════
  'Blood Urea Nitrogen': {
    unit: 'mg/dL',
    min: 7,
    max: 20,
    criticalLow: 2,
    criticalHigh: 100,
    description: 'BUN'
  },
  'Creatinine': {
    unit: 'mg/dL',
    min: 0.6,
    max: 1.2,
    criticalLow: 0.3,
    criticalHigh: 5.0,
    description: 'Serum creatinine',
    gender: {
      male: { min: 0.7, max: 1.3 },
      female: { min: 0.6, max: 1.1 }
    }
  },
  'Uric Acid': {
    unit: 'mg/dL',
    min: 3.5,
    max: 7.2,
    criticalLow: 1.0,
    criticalHigh: 12.0,
    description: 'Serum uric acid',
    gender: {
      male: { min: 3.5, max: 7.2 },
      female: { min: 2.6, max: 6.0 }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LIVER FUNCTION
  // ═══════════════════════════════════════════════════════════════
  'AST (SGOT)': {
    unit: 'U/L',
    min: 0,
    max: 40,
    criticalLow: 0,
    criticalHigh: 200,
    description: 'Aspartate aminotransferase'
  },
  'ALT (SGPT)': {
    unit: 'U/L',
    min: 0,
    max: 41,
    criticalLow: 0,
    criticalHigh: 200,
    description: 'Alanine aminotransferase'
  },
  'Total Bilirubin': {
    unit: 'mg/dL',
    min: 0.1,
    max: 1.2,
    criticalLow: 0,
    criticalHigh: 5.0,
    description: 'Total bilirubin'
  },

  // ═══════════════════════════════════════════════════════════════
  // THYROID FUNCTION
  // ═══════════════════════════════════════════════════════════════
  'FT3': {
    unit: 'pg/mL',
    min: 2.3,
    max: 4.2,
    criticalLow: 1.0,
    criticalHigh: 8.0,
    description: 'Free Triiodothyronine (Free T3)'
  },
  'FT4': {
    unit: 'ng/dL',
    min: 0.8,
    max: 1.8,
    criticalLow: 0.3,
    criticalHigh: 4.0,
    description: 'Free Thyroxine (Free T4)'
  },
  'T3 Total': {
    unit: 'ng/dL',
    min: 80,
    max: 200,
    criticalLow: 40,
    criticalHigh: 300,
    description: 'Total Triiodothyronine (Total T3)'
  },
  'T4 Total': {
    unit: 'μg/dL',
    min: 5.0,
    max: 12.0,
    criticalLow: 2.0,
    criticalHigh: 20.0,
    description: 'Total Thyroxine (Total T4)'
  },
  'TSH': {
    unit: 'μIU/mL',
    min: 0.4,
    max: 4.5,
    criticalLow: 0.01,
    criticalHigh: 10.0,
    description: 'Thyroid Stimulating Hormone'
  }
};

/**
 * Determine status of a test result based on reference ranges
 * @param {string} parameterName - Normalized parameter name
 * @param {number|string} value - Test value
 * @param {string} unit - Unit of measurement (optional, for validation)
 * @param {string} gender - Patient gender (optional, for gender-specific ranges)
 * @returns {string} 'NORMAL', 'HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW'
 */
function determineStatus(parameterName, value, unit = null, gender = null) {
  // Parse numeric value
  const numericValue = parseFloat(value);
  
  if (isNaN(numericValue)) {
    return 'NORMAL'; // Can't determine status for non-numeric values
  }

  // Get reference range for this parameter
  const reference = REFERENCE_RANGES[parameterName];
  
  if (!reference) {
    // No reference range defined - return NORMAL
    return 'NORMAL';
  }

  // Use gender-specific ranges if available
  let min = reference.min;
  let max = reference.max;
  
  if (reference.gender && gender && reference.gender[gender.toLowerCase()]) {
    const genderRange = reference.gender[gender.toLowerCase()];
    min = genderRange.min;
    max = genderRange.max;
  }

  // Determine status
  if (numericValue < reference.criticalLow) {
    return 'CRITICAL_LOW';
  }
  if (numericValue > reference.criticalHigh) {
    return 'CRITICAL_HIGH';
  }
  if (numericValue < min) {
    return 'LOW';
  }
  if (numericValue > max) {
    return 'HIGH';
  }
  
  return 'NORMAL';
}

/**
 * Get reference range text for a parameter
 * @param {string} parameterName - Normalized parameter name
 * @param {string} gender - Patient gender (optional)
 * @returns {string} Reference range text (e.g., "70-110 mg/dL")
 */
function getReferenceRangeText(parameterName, gender = null) {
  const reference = REFERENCE_RANGES[parameterName];
  
  if (!reference) {
    return '';
  }

  let min = reference.min;
  let max = reference.max;
  
  if (reference.gender && gender && reference.gender[gender.toLowerCase()]) {
    const genderRange = reference.gender[gender.toLowerCase()];
    min = genderRange.min;
    max = genderRange.max;
  }

  return `${min}-${max} ${reference.unit}`;
}

/**
 * Check if a parameter has defined reference ranges
 * @param {string} parameterName - Normalized parameter name
 * @returns {boolean}
 */
function hasReferenceRange(parameterName) {
  return parameterName in REFERENCE_RANGES;
}

/**
 * Get all defined reference ranges
 * @returns {object} All reference ranges
 */
function getAllReferenceRanges() {
  return { ...REFERENCE_RANGES };
}

module.exports = {
  REFERENCE_RANGES,
  determineStatus,
  getReferenceRangeText,
  hasReferenceRange,
  getAllReferenceRanges
};
