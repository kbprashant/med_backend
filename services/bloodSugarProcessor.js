/**
 * Blood Sugar Report Processor
 * 
 * Production-ready module for processing blood sugar medical reports
 * 
 * Features:
 * - Extracts and maps blood sugar parameters to standard keys
 * - Evaluates medical ranges (Low/Normal/High)
 * - Handles missing parameters gracefully
 * - Returns structured JSON output
 * - Includes confidence scoring
 * - Unit normalization
 * - Defensive programming
 * 
 * @module bloodSugarProcessor
 */

const bloodSugarTemplate = require('./reportTemplates/bloodSugarTemplate');

/**
 * Process blood sugar report from extracted OCR data
 * 
 * @param {Array<Object>} extractedData - Array of extracted parameters
 * @param {string} extractedData[].parameter - Parameter name
 * @param {number|string} extractedData[].value - Parameter value
 * @param {string} extractedData[].unit - Unit of measurement
 * 
 * @returns {Object} Structured blood sugar report
 * 
 * @example
 * const extractedData = [
 *   { parameter: 'Fasting Glucose', value: 138, unit: 'mg/dl' },
 *   { parameter: 'HbA1c', value: 6.8, unit: '%' }
 * ];
 * 
 * const report = processBloodSugarReport(extractedData);
 * // Returns structured object with all 4 blood sugar parameters
 */
function processBloodSugarReport(extractedData) {
  // Input validation
  if (!Array.isArray(extractedData)) {
    throw new Error('extractedData must be an array');
  }

  // Initialize report with all parameters set to null
  const report = bloodSugarTemplate.initializeReport();
  
  // Track which parameters were found
  const detectedParameters = new Set();
  
  // Process each extracted parameter
  for (const item of extractedData) {
    // Skip invalid items
    if (!item || typeof item !== 'object') {
      continue;
    }

    const { parameter, value, unit } = item;
    
    // Skip if no parameter name
    if (!parameter) {
      continue;
    }

    // Map to standard key
    const standardKey = bloodSugarTemplate.mapToStandard(parameter);
    
    if (!standardKey) {
      // Not a blood sugar parameter, skip
      continue;
    }

    // Skip if this parameter was already detected (keep first occurrence)
    if (detectedParameters.has(standardKey)) {
      continue;
    }

    // Parse numeric value
    let numericValue = null;
    if (value !== null && value !== undefined) {
      numericValue = typeof value === 'number' ? value : parseFloat(value);
      
      // Validate parsed value
      if (isNaN(numericValue)) {
        numericValue = null;
      }
    }

    // Normalize unit
    const normalizedUnit = bloodSugarTemplate.normalizeUnit(unit || '');

    // Evaluate medical status
    const status = bloodSugarTemplate.evaluateRange(standardKey, numericValue);

    // Calculate confidence score
    const confidence = bloodSugarTemplate.calculateConfidence(
      standardKey,
      parameter,
      numericValue,
      normalizedUnit
    );

    // Update report
    report[standardKey] = {
      name: bloodSugarTemplate.BLOOD_SUGAR_TEMPLATE[standardKey].name,
      value: numericValue,
      unit: normalizedUnit || bloodSugarTemplate.BLOOD_SUGAR_TEMPLATE[standardKey].unit,
      status: status,
      confidence: confidence
    };

    // Mark as detected
    detectedParameters.add(standardKey);
  }

  return report;
}

/**
 * Get summary statistics for a blood sugar report
 * 
 * @param {Object} report - Processed blood sugar report
 * @returns {Object} Summary statistics
 * 
 * @example
 * const summary = getReportSummary(report);
 * // { totalParameters: 4, detected: 2, missing: 2, abnormal: 1, ... }
 */
function getReportSummary(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('Invalid report object');
  }

  const summary = {
    totalParameters: 0,
    detected: 0,
    missing: 0,
    normal: 0,
    abnormal: 0,
    low: 0,
    high: 0,
    prediabetes: 0,
    averageConfidence: 0,
    parameters: {
      detected: [],
      missing: [],
      abnormal: []
    }
  };

  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const [key, data] of Object.entries(report)) {
    summary.totalParameters++;

    if (data.value !== null) {
      summary.detected++;
      summary.parameters.detected.push(data.name);

      // Track confidence
      if (data.confidence !== null) {
        totalConfidence += data.confidence;
        confidenceCount++;
      }

      // Track status
      if (data.status === 'Normal') {
        summary.normal++;
      } else if (data.status === 'Low') {
        summary.low++;
        summary.abnormal++;
        summary.parameters.abnormal.push({ name: data.name, status: 'Low' });
      } else if (data.status === 'High') {
        summary.high++;
        summary.abnormal++;
        summary.parameters.abnormal.push({ name: data.name, status: 'High' });
      } else if (data.status === 'Prediabetes') {
        summary.prediabetes++;
        summary.abnormal++;
        summary.parameters.abnormal.push({ name: data.name, status: 'Prediabetes' });
      }
    } else {
      summary.missing++;
      summary.parameters.missing.push(data.name);
    }
  }

  // Calculate average confidence
  if (confidenceCount > 0) {
    summary.averageConfidence = Math.round(totalConfidence / confidenceCount);
  }

  return summary;
}

/**
 * Get medical interpretation text for a blood sugar report
 * 
 * @param {Object} report - Processed blood sugar report
 * @returns {string} Human-readable interpretation
 */
function getInterpretation(report) {
  const summary = getReportSummary(report);

  if (summary.detected === 0) {
    return 'No blood sugar parameters detected in the report.';
  }

  let interpretation = '';

  // Overall assessment
  if (summary.abnormal === 0) {
    interpretation = '✅ All detected blood sugar parameters are within normal range.\n\n';
  } else if (summary.abnormal === summary.detected) {
    interpretation = '⚠️ All detected blood sugar parameters are outside normal range.\n\n';
  } else {
    interpretation = `⚠️ ${summary.abnormal} out of ${summary.detected} blood sugar parameter(s) are outside normal range.\n\n`;
  }

  // Detail abnormal values
  if (summary.parameters.abnormal.length > 0) {
    interpretation += 'Abnormal values:\n';
    for (const param of summary.parameters.abnormal) {
      const data = Object.values(report).find(r => r.name === param.name);
      interpretation += `• ${param.name}: ${data.value} ${data.unit} (${param.status})\n`;
    }
    interpretation += '\n';
  }

  // Medical advice
  if (summary.high > 0 || summary.prediabetes > 0) {
    interpretation += '⚕️ Elevated blood sugar levels detected. Please consult your healthcare provider for proper evaluation and management.\n';
  }

  if (summary.low > 0) {
    interpretation += '⚠️ Low blood sugar detected. If you experience symptoms like dizziness, shakiness, or confusion, seek immediate medical attention.\n';
  }

  // Missing parameters
  if (summary.missing > 0) {
    interpretation += `\nℹ️ Missing parameters: ${summary.parameters.missing.join(', ')}`;
  }

  return interpretation.trim();
}

/**
 * Validate a blood sugar report for completeness
 * 
 * @param {Object} report - Processed blood sugar report
 * @param {Array<string>} requiredParameters - Required parameter keys
 * @returns {Object} Validation result
 */
function validateReport(report, requiredParameters = ['fasting_glucose']) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check required parameters
  for (const key of requiredParameters) {
    if (!report[key] || report[key].value === null) {
      validation.isValid = false;
      validation.errors.push(`Missing required parameter: ${bloodSugarTemplate.BLOOD_SUGAR_TEMPLATE[key].name}`);
    }
  }

  // Check for low confidence values
  for (const [key, data] of Object.entries(report)) {
    if (data.value !== null && data.confidence !== null && data.confidence < 60) {
      validation.warnings.push(`Low confidence (${data.confidence}%) for ${data.name}`);
    }
  }

  return validation;
}

/**
 * Export report in different formats
 * 
 * @param {Object} report - Processed blood sugar report
 * @param {string} format - Export format ('json', 'summary', 'medical')
 * @returns {Object|string} Formatted report
 */
function exportReport(report, format = 'json') {
  switch (format) {
    case 'json':
      return report;
    
    case 'summary':
      return getReportSummary(report);
    
    case 'medical':
      return {
        report,
        summary: getReportSummary(report),
        interpretation: getInterpretation(report)
      };
    
    case 'compact':
      // Only include detected parameters
      const compact = {};
      for (const [key, data] of Object.entries(report)) {
        if (data.value !== null) {
          compact[key] = {
            value: data.value,
            unit: data.unit,
            status: data.status
          };
        }
      }
      return compact;
    
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

module.exports = {
  processBloodSugarReport,
  getReportSummary,
  getInterpretation,
  validateReport,
  exportReport
};
