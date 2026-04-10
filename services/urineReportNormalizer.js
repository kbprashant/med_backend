/**
 * URINE REPORT NORMALIZER
 * 
 * Converts raw extracted urine report data into standardized format
 * Handles various terminologies, spelling variations, and missing parameters
 */

class UrineReportNormalizer {
  constructor() {
    // Parameter name mappings (alias → standard name)
    this.parameterMappings = {
      // Physical parameters
      'quantity': { standard: 'quantity', section: 'physical' },
      'volume': { standard: 'quantity', section: 'physical' },
      'color': { standard: 'color', section: 'physical' },
      'colour': { standard: 'color', section: 'physical' },
      'appearance': { standard: 'appearance', section: 'physical' },
      'clarity': { standard: 'appearance', section: 'physical' },
      'turbidity': { standard: 'turbidity', section: 'physical' },
      'deposit': { standard: 'deposit', section: 'physical' },
      'sediment': { standard: 'deposit', section: 'physical' },
      'odor': { standard: 'odor', section: 'physical' },
      'odour': { standard: 'odor', section: 'physical' },
      'smell': { standard: 'odor', section: 'physical' },
      
      // Chemical parameters
      'ph': { standard: 'pH', section: 'chemical' },
      'reaction': { standard: 'pH', section: 'chemical' },
      'specific gravity': { standard: 'specificGravity', section: 'chemical' },
      'sp gravity': { standard: 'specificGravity', section: 'chemical' },
      'sp gr': { standard: 'specificGravity', section: 'chemical' },
      'sg': { standard: 'specificGravity', section: 'chemical' },
      'protein': { standard: 'protein', section: 'chemical' },
      'proteins': { standard: 'protein', section: 'chemical' },
      'albumin': { standard: 'albumin', section: 'chemical' },
      'sugar': { standard: 'sugar', section: 'chemical' },
      'glucose': { standard: 'sugar', section: 'chemical' },
      'reducing substances': { standard: 'sugar', section: 'chemical' },
      'ketone': { standard: 'ketone', section: 'chemical' },
      'ketones': { standard: 'ketone', section: 'chemical' },
      'ketone bodies': { standard: 'ketone', section: 'chemical' },
      'acetone': { standard: 'ketone', section: 'chemical' },
      'acetone bodies': { standard: 'ketone', section: 'chemical' },
      'bile pigment': { standard: 'bilePigment', section: 'chemical' },
      'bile pigments': { standard: 'bilePigment', section: 'chemical' },
      'bilirubin': { standard: 'bilePigment', section: 'chemical' },
      'bile salts': { standard: 'bileSalts', section: 'chemical' },
      'bile salt': { standard: 'bileSalts', section: 'chemical' },
      'urobilinogen': { standard: 'urobilinogen', section: 'chemical' },
      'occult blood': { standard: 'occultBlood', section: 'chemical' },
      'blood': { standard: 'occultBlood', section: 'chemical' },
      'haemoglobin': { standard: 'occultBlood', section: 'chemical' },
      'hemoglobin': { standard: 'occultBlood', section: 'chemical' },
      'nitrite': { standard: 'nitrite', section: 'chemical' },
      'nitrites': { standard: 'nitrite', section: 'chemical' },
      'leukocyte esterase': { standard: 'leukocyteEsterase', section: 'chemical' },
      'leukocyte': { standard: 'leukocyteEsterase', section: 'chemical' },
      'leukocytes': { standard: 'leukocyteEsterase', section: 'chemical' },
      'leucocyte esterase': { standard: 'leukocyteEsterase', section: 'chemical' },
      
      // Microscopic parameters
      'pus cells': { standard: 'pusCells', section: 'microscopic' },
      'pus cell': { standard: 'pusCells', section: 'microscopic' },
      'wbc': { standard: 'pusCells', section: 'microscopic' },
      'white blood cells': { standard: 'pusCells', section: 'microscopic' },
      'white cells': { standard: 'pusCells', section: 'microscopic' },
      'epithelial cells': { standard: 'epithelialCells', section: 'microscopic' },
      'epithelial cell': { standard: 'epithelialCells', section: 'microscopic' },
      'epi cells': { standard: 'epithelialCells', section: 'microscopic' },
      'red blood cells': { standard: 'redBloodCells', section: 'microscopic' },
      'red blood cell': { standard: 'redBloodCells', section: 'microscopic' },
      'rbc': { standard: 'redBloodCells', section: 'microscopic' },
      'red cells': { standard: 'redBloodCells', section: 'microscopic' },
      'casts': { standard: 'casts', section: 'microscopic' },
      'cast': { standard: 'casts', section: 'microscopic' },
      'hyaline casts': { standard: 'hyalineCasts', section: 'microscopic' },
      'granular casts': { standard: 'granularCasts', section: 'microscopic' },
      'rbc casts': { standard: 'rbcCasts', section: 'microscopic' },
      'wbc casts': { standard: 'wbcCasts', section: 'microscopic' },
      'crystals': { standard: 'crystals', section: 'microscopic' },
      'crystal': { standard: 'crystals', section: 'microscopic' },
      'calcium oxalate': { standard: 'calciumOxalate', section: 'microscopic' },
      'uric acid': { standard: 'uricAcid', section: 'microscopic' },
      'triple phosphate': { standard: 'triplephosphate', section: 'microscopic' },
      'bacteria': { standard: 'bacteria', section: 'microscopic' },
      'yeast': { standard: 'yeast', section: 'microscopic' },
      'yeast cells': { standard: 'yeast', section: 'microscopic' },
      'mucus': { standard: 'mucus', section: 'microscopic' },
      'mucus threads': { standard: 'mucus', section: 'microscopic' },
      'sperm cells': { standard: 'spermCells', section: 'microscopic' },
      'spermatozoa': { standard: 'spermCells', section: 'microscopic' },
      'trichomonas': { standard: 'trichomonas', section: 'microscopic' }
    };

    // Qualitative value mappings (normalize to standard terms)
    this.qualitativeMappings = {
      // Negative/Absent
      'absent': 'Absent',
      'nil': 'Absent',
      'negative': 'Absent',
      'not detected': 'Absent',
      'nd': 'Absent',
      'not seen': 'Absent',
      '-': 'Absent',
      'neg': 'Absent',
      
      // Trace
      'trace': 'Trace',
      'trace +': 'Trace',
      '+': 'Trace',
      '1+': 'Trace',
      
      // Few
      'few': 'Few',
      'few seen': 'Few Seen',
      'rare': 'Few',
      '1-2': 'Few',
      '0-2': 'Few',
      '2-4': 'Few',
      
      // Moderate
      'moderate': 'Moderate',
      '2+': 'Moderate',
      '++': 'Moderate',
      '4-6': 'Moderate',
      '5-10': 'Moderate',
      
      // Many
      'many': 'Many',
      'plenty': 'Many',
      '3+': 'Many',
      '+++': 'Many',
      '4+': 'Many',
      '++++': 'Many',
      '>10': 'Many',
      'numerous': 'Many',
      
      // Normal
      'normal': 'Normal',
      'within normal limits': 'Normal',
      'wnl': 'Normal',
      
      // Appearance
      'clear': 'Clear',
      'transparent': 'Transparent',
      'turbid': 'Turbid',
      'cloudy': 'Cloudy',
      'slightly turbid': 'Slightly Turbid',
      'hazy': 'Hazy',
      
      // Color
      'yellow': 'Yellow',
      'yellowish': 'Yellowish',
      'pale yellow': 'Pale Yellow',
      'dark yellow': 'Dark Yellow',
      'amber': 'Amber',
      'straw': 'Straw',
      'colorless': 'Colorless',
      
      // pH
      'acidic': 'Acidic',
      'acid': 'Acidic',
      'alkaline': 'Alkaline',
      'neutral': 'Neutral',
      
      // Present
      'present': 'Present',
      'detected': 'Present'
    };
  }

  /**
   * Normalize raw extracted data into standardized format
   * @param {Array|Object} rawData - Extracted parameters (array of {parameter, value, unit} or key-value object)
   * @param {Object} metadata - Report metadata (reportId, userId, reportDate, etc.)
   * @returns {Object} Normalized urine report document
   */
  normalize(rawData, metadata = {}) {
    const startTime = Date.now();
    
    // Initialize normalized structure
    const normalized = {
      reportId: metadata.reportId || this.generateReportId(),
      userId: metadata.userId || '',
      reportDate: metadata.reportDate || new Date(),
      labName: metadata.labName || '',
      
      physical: {},
      chemical: {},
      microscopic: {},
      additionalParameters: [],
      
      rawOcrText: metadata.rawOcrText || '',
      extractionMetadata: {
        method: metadata.method || 'OCR',
        confidence: 0,
        extractedAt: new Date(),
        processingTimeMs: 0
      },
      
      notes: metadata.notes || '',
      interpretation: metadata.interpretation || ''
    };

    // Convert rawData to array format if it's an object
    let parameters = [];
    if (Array.isArray(rawData)) {
      parameters = rawData;
    } else if (typeof rawData === 'object') {
      parameters = Object.entries(rawData).map(([key, value]) => ({
        parameter: key,
        value: value,
        unit: ''
      }));
    }

    // Track total confidence for averaging
    let totalConfidence = 0;
    let paramCount = 0;

    // Process each parameter
    for (const param of parameters) {
      const normalized_param = this.normalizeParameter(param);
      
      if (normalized_param) {
        const { section, standardName, parameterData } = normalized_param;
        
        // Add to appropriate section
        if (section === 'physical' || section === 'chemical' || section === 'microscopic') {
          normalized[section][standardName] = parameterData;
        } else {
          // Unknown parameter - add to additionalParameters
          normalized.additionalParameters.push(parameterData);
        }
        
        totalConfidence += parameterData.confidence || 0;
        paramCount++;
      }
    }

    // Calculate average confidence
    normalized.extractionMetadata.confidence = paramCount > 0 
      ? Math.round(totalConfidence / paramCount) 
      : 0;
    
    // Calculate processing time
    normalized.extractionMetadata.processingTimeMs = Date.now() - startTime;

    return normalized;
  }

  /**
   * Normalize a single parameter
   * @param {Object} param - Raw parameter {parameter, value, unit}
   * @returns {Object|null} Normalized parameter with section info
   */
  normalizeParameter(param) {
    if (!param || !param.parameter) return null;

    const rawName = param.parameter.toLowerCase().trim();
    const rawValue = param.value;
    const rawUnit = param.unit || '';

    // Map to standard parameter name
    const mapping = this.findParameterMapping(rawName);
    
    if (!mapping) {
      // Unknown parameter - return as additional parameter
      return {
        section: 'additional',
        standardName: param.parameter,
        parameterData: this.createParameterData(param.parameter, rawValue, rawUnit)
      };
    }

    const { standard, section } = mapping;
    const parameterData = this.createParameterData(standard, rawValue, rawUnit);

    return {
      section,
      standardName: standard,
      parameterData
    };
  }

  /**
   * Find parameter mapping from aliases
   * @param {String} rawName - Raw parameter name
   * @returns {Object|null} Mapping object {standard, section}
   */
  findParameterMapping(rawName) {
    // Direct match
    if (this.parameterMappings[rawName]) {
      return this.parameterMappings[rawName];
    }

    // Fuzzy match (contains keyword)
    for (const [alias, mapping] of Object.entries(this.parameterMappings)) {
      if (rawName.includes(alias) || alias.includes(rawName)) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Create parameter data object
   * @param {String} name - Parameter name
   * @param {*} value - Parameter value
   * @param {String} unit - Unit
   * @returns {Object} Parameter data object
   */
  createParameterData(name, value, unit = '') {
    const paramData = {
      name: this.formatParameterName(name),
      value: value,
      qualitative: null,
      numericValue: null,
      range: { min: null, max: null },
      unit: unit.trim(),
      referenceRange: null,
      isAbnormal: false,
      confidence: 5 // Default confidence
    };

    // Determine if value is qualitative or quantitative
    const { qualitative, numericValue, range } = this.parseValue(value);
    
    paramData.qualitative = qualitative;
    paramData.numericValue = numericValue;
    
    if (range) {
      paramData.range = range;
    }

    // Check if abnormal (can be enhanced with reference ranges)
    paramData.isAbnormal = this.isAbnormal(name, qualitative, numericValue);
    
    // Higher confidence for standard qualitative values
    if (qualitative && this.qualitativeMappings[qualitative.toLowerCase()]) {
      paramData.confidence = 10;
    } else if (numericValue !== null) {
      paramData.confidence = 8;
    }

    return paramData;
  }

  /**
   * Parse value to extract qualitative, numeric, and range components
   * @param {*} value - Raw value
   * @returns {Object} {qualitative, numericValue, range}
   */
  parseValue(value) {
    const result = {
      qualitative: null,
      numericValue: null,
      range: null
    };

    if (value === null || value === undefined) {
      return result;
    }

    const valueStr = String(value).trim().toLowerCase();

    // Check for qualitative value
    if (this.qualitativeMappings[valueStr]) {
      result.qualitative = this.qualitativeMappings[valueStr];
    } else {
      // Store original qualitative text (capitalize first letter)
      const words = valueStr.split(' ');
      result.qualitative = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Check for numeric value
    const numMatch = valueStr.match(/(\d+\.?\d*)/);
    if (numMatch) {
      result.numericValue = parseFloat(numMatch[1]);
    }

    // Check for range (e.g., "5-10", "2-4 cells/hpf")
    const rangeMatch = valueStr.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      result.range = {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10)
      };
    }

    return result;
  }

  /**
   * Format parameter name (capitalize properly)
   * @param {String} name - Raw parameter name
   * @returns {String} Formatted name
   */
  formatParameterName(name) {
    // Special cases
    if (name === 'pH') return 'pH';
    if (name === 'specificGravity') return 'Specific Gravity';
    if (name === 'pusCells') return 'Pus Cells';
    if (name === 'redBloodCells') return 'Red Blood Cells';
    if (name === 'epithelialCells') return 'Epithelial Cells';
    if (name === 'bilePigment') return 'Bile Pigment';
    if (name === 'bileSalts') return 'Bile Salts';
    if (name === 'occultBlood') return 'Occult Blood';
    if (name === 'leukocyteEsterase') return 'Leukocyte Esterase';

    // Convert camelCase to Title Case
    const result = name.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  /**
   * Check if parameter value is abnormal
   * @param {String} name - Parameter name
   * @param {String} qualitative - Qualitative value
   * @param {Number} numericValue - Numeric value
   * @returns {Boolean} True if abnormal
   */
  isAbnormal(name, qualitative, numericValue) {
    // Define abnormal conditions
    const abnormalQualitative = ['Trace', 'Few', 'Few Seen', 'Moderate', 'Many', 'Plenty', 'Present', 'Detected', 'Turbid', 'Cloudy'];
    
    // Chemical parameters - should be Absent/Negative
    const shouldBeAbsent = ['protein', 'sugar', 'ketone', 'bilePigment', 'bileSalts', 'occultBlood', 'nitrite', 'leukocyteEsterase'];
    
    if (shouldBeAbsent.some(p => name.toLowerCase().includes(p.toLowerCase()))) {
      if (qualitative && !['Absent', 'Nil', 'Negative', 'Not Detected', 'ND'].includes(qualitative)) {
        return true;
      }
    }

    // Microscopic - pus cells, RBC, bacteria should be absent
    const microscopicShouldBeAbsent = ['pusCells', 'redBloodCells', 'bacteria', 'yeast', 'casts', 'crystals'];
    if (microscopicShouldBeAbsent.some(p => name.toLowerCase().includes(p.toLowerCase()))) {
      if (qualitative && abnormalQualitative.includes(qualitative)) {
        return true;
      }
    }

    // Numeric ranges
    if (name.toLowerCase().includes('ph') && numericValue) {
      if (numericValue < 4.5 || numericValue > 8.0) return true;
    }
    
    if (name.toLowerCase().includes('specific gravity') && numericValue) {
      if (numericValue < 1.005 || numericValue > 1.030) return true;
    }

    return false;
  }

  /**
   * Generate unique report ID
   * @returns {String} Report ID (format: UR-YYYY-MM-DD-XXX)
   */
  generateReportId() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `UR-${dateStr}-${randomSuffix}`;
  }

  /**
   * Convert normalized report to database-ready format
   * @param {Object} normalized - Normalized report
   * @returns {Object} Database-ready document
   */
  toDatabaseFormat(normalized) {
    // Clean up empty sections
    const cleanSection = (section) => {
      if (!section || Object.keys(section).length === 0) return undefined;
      return section;
    };

    return {
      ...normalized,
      physical: cleanSection(normalized.physical),
      chemical: cleanSection(normalized.chemical),
      microscopic: cleanSection(normalized.microscopic),
      additionalParameters: normalized.additionalParameters.length > 0 
        ? normalized.additionalParameters 
        : undefined
    };
  }
}

// Export singleton instance
module.exports = new UrineReportNormalizer();
