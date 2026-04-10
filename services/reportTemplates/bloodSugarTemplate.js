/**
 * Blood Sugar Report Template
 * 
 * Defines the structure, ranges, and processing rules for blood sugar reports
 * This template-based approach makes it easy to add new report types (Lipid, CBC, etc.)
 */

/**
 * Blood Sugar Parameter Template
 * Defines all supported parameters with display names, units, and reference ranges
 */
const BLOOD_SUGAR_TEMPLATE = {
  fasting_glucose: {
    name: 'Fasting Glucose',
    unit: 'mg/dL',
    ranges: {
      low: { max: 70 },
      normal: { min: 70, max: 99 },
      high: { min: 100 }
    },
    matchPatterns: [
      /fasting\s+glucose/i,
      /glucose\s+fasting/i,
      /blood\s+sugar\s+fasting/i,
      /fbs/i,
      /fpg/i
    ],
    confidence: {
      exactMatch: 100,
      partialMatch: 80,
      fuzzyMatch: 60
    }
  },
  
  postprandial_glucose: {
    name: 'Postprandial Glucose',
    unit: 'mg/dL',
    ranges: {
      low: { max: 70 },
      normal: { min: 70, max: 139 },
      high: { min: 140 }
    },
    matchPatterns: [
      /postprandial\s+glucose/i,
      /post\s*prandial/i,
      /glucose\s+pp/i,
      /pp\s+glucose/i,
      /ppbs/i,
      /2\s*hr\s+glucose/i,
      /2\s*hour\s+glucose/i,
      /post\s+meal/i
    ],
    confidence: {
      exactMatch: 100,
      partialMatch: 80,
      fuzzyMatch: 60
    }
  },
  
  random_glucose: {
    name: 'Random Glucose',
    unit: 'mg/dL',
    ranges: {
      low: { max: 70 },
      normal: { min: 70, max: 139 },
      high: { min: 140 }
    },
    matchPatterns: [
      /random\s+glucose/i,
      /glucose\s+random/i,
      /random\s+blood\s+sugar/i,
      /rbs/i
    ],
    confidence: {
      exactMatch: 100,
      partialMatch: 80,
      fuzzyMatch: 60
    }
  },
  
  hba1c: {
    name: 'HbA1c',
    unit: '%',
    ranges: {
      low: { max: 4.0 },
      normal: { min: 4.0, max: 5.6 },
      prediabetes: { min: 5.7, max: 6.4 },
      high: { min: 6.5 }
    },
    matchPatterns: [
      /hba1c/i,
      /hb\s*a1c/i,
      /a1c/i,
      /glycated\s+hemoglobin/i,
      /glycosylated\s+hemoglobin/i,
      /hemoglobin\s+a1c/i
    ],
    confidence: {
      exactMatch: 100,
      partialMatch: 90,
      fuzzyMatch: 70
    }
  }
};

/**
 * Map a parameter name to a standard blood sugar key
 * @param {string} parameterName - Raw parameter name from extraction
 * @returns {string|null} Standard key (e.g., 'fasting_glucose') or null
 */
function mapToStandard(parameterName) {
  if (!parameterName || typeof parameterName !== 'string') {
    return null;
  }

  const normalized = parameterName.trim().toLowerCase();

  // Try to match against each template pattern
  for (const [standardKey, template] of Object.entries(BLOOD_SUGAR_TEMPLATE)) {
    for (const pattern of template.matchPatterns) {
      if (pattern.test(normalized)) {
        return standardKey;
      }
    }
  }

  return null;
}

/**
 * Evaluate the medical status of a value based on reference ranges
 * @param {string} key - Standard parameter key (e.g., 'fasting_glucose')
 * @param {number} value - Numeric value
 * @returns {string} Status: 'Low', 'Normal', 'Prediabetes', 'High'
 */
function evaluateRange(key, value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return null;
  }

  const template = BLOOD_SUGAR_TEMPLATE[key];
  if (!template || !template.ranges) {
    return null;
  }

  const ranges = template.ranges;

  // Check each range in order
  if (ranges.low && value < ranges.low.max) {
    return 'Low';
  }
  
  if (ranges.normal && value >= ranges.normal.min && value <= ranges.normal.max) {
    return 'Normal';
  }
  
  // Special case for HbA1c prediabetes range
  if (ranges.prediabetes && value >= ranges.prediabetes.min && value <= ranges.prediabetes.max) {
    return 'Prediabetes';
  }
  
  if (ranges.high && value >= ranges.high.min) {
    return 'High';
  }

  return null;
}

/**
 * Calculate confidence score for a parameter match
 * @param {string} standardKey - The standard key matched
 * @param {string} originalName - Original parameter name
 * @param {number} value - Parameter value
 * @param {string} unit - Parameter unit
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidence(standardKey, originalName, value, unit) {
  const template = BLOOD_SUGAR_TEMPLATE[standardKey];
  if (!template) return 0;

  let confidence = 0;
  const normalized = originalName.toLowerCase();

  // Check pattern match quality
  for (let i = 0; i < template.matchPatterns.length; i++) {
    const pattern = template.matchPatterns[i];
    if (pattern.test(normalized)) {
      // First pattern = exact match, later patterns = partial/fuzzy
      if (i === 0) {
        confidence += template.confidence.exactMatch;
      } else if (i <= 2) {
        confidence += template.confidence.partialMatch;
      } else {
        confidence += template.confidence.fuzzyMatch;
      }
      break;
    }
  }

  // Bonus for valid unit
  const normalizedUnit = unit ? unit.toLowerCase().replace(/\s+/g, '') : '';
  const expectedUnit = template.unit.toLowerCase().replace(/\s+/g, '');
  
  if (normalizedUnit.includes(expectedUnit) || expectedUnit.includes(normalizedUnit)) {
    confidence = Math.min(100, confidence + 20);
  }

  // Bonus for numeric value
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    confidence = Math.min(100, confidence + 10);
  }

  return Math.round(confidence);
}

/**
 * Normalize unit to standard format
 * @param {string} unit - Raw unit string
 * @returns {string} Normalized unit
 */
function normalizeUnit(unit) {
  if (!unit) return '';
  
  const normalized = unit.toLowerCase().replace(/\s+/g, '');
  
  // mg/dl variations
  if (/mg\/?d?l/i.test(normalized)) {
    return 'mg/dL';
  }
  
  // percentage
  if (normalized === '%' || normalized === 'percent' || normalized === 'percentage') {
    return '%';
  }
  
  // mmol/L
  if (/mmol\/?l/i.test(normalized)) {
    return 'mmol/L';
  }
  
  return unit.trim();
}

/**
 * Initialize empty blood sugar report with all parameters set to null
 * @returns {Object} Empty report structure
 */
function initializeReport() {
  const report = {};
  
  for (const [key, template] of Object.entries(BLOOD_SUGAR_TEMPLATE)) {
    report[key] = {
      name: template.name,
      value: null,
      unit: template.unit,
      status: null,
      confidence: null
    };
  }
  
  return report;
}

/**
 * Get reference range text for a parameter
 * @param {string} key - Standard parameter key
 * @returns {string} Reference range description
 */
function getReferenceRangeText(key) {
  const template = BLOOD_SUGAR_TEMPLATE[key];
  if (!template || !template.ranges) {
    return '';
  }

  const ranges = template.ranges;
  const unit = template.unit;

  if (ranges.prediabetes) {
    // HbA1c special case
    return `Normal: ${ranges.normal.min}-${ranges.normal.max}${unit}, Prediabetes: ${ranges.prediabetes.min}-${ranges.prediabetes.max}${unit}, High: ≥${ranges.high.min}${unit}`;
  } else {
    return `Normal: ${ranges.normal.min}-${ranges.normal.max} ${unit}`;
  }
}

module.exports = {
  BLOOD_SUGAR_TEMPLATE,
  mapToStandard,
  evaluateRange,
  calculateConfidence,
  normalizeUnit,
  initializeReport,
  getReferenceRangeText
};
