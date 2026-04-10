/**
 * Report Type Detector Service
 * 
 * Analyzes OCR text to detect the report type BEFORE extraction.
 * Uses keyword matching and parameter presence detection from masterDictionary.json
 */

const { loadDictionary } = require('./dictionary/dictionaryLoader');

class ReportTypeDetector {
  constructor() {
    // Load master dictionary
    try {
      this.dictionary = loadDictionary();
      console.log(`📋 Loaded ${Object.keys(this.dictionary.reportTypes).length} report type definitions from masterDictionary`);
    } catch (error) {
      console.error('❌ Failed to load masterDictionary:', error.message);
      this.dictionary = { reportTypes: {} };
    }
  }

  /**
   * Detect report type from OCR text using masterDictionary
   * @param {string} ocrText - Raw OCR text
   * @returns {string|null} - Detected report type (e.g., 'DIABETES', 'KFT', 'CBC')
   */
  detectReportType(ocrText) {
    if (!ocrText || ocrText.trim().length < 10) {
      console.log('⚠️  OCR text too short for detection');
      return null;
    }

    const lowerText = ocrText.toLowerCase();
    const scores = {};

    // SPECIAL RULE: Strong diabetes indicators override everything
    const diabetesIndicators = [
      'fasting blood glucose',
      'fasting blood sugar', 
      'postprandial glucose',
      'post prandial glucose',
      'ppbs',
      'fbs',
      'glucose fasting',
      'glucose pp',
      'blood glucose level',
      'hba1c'
    ];
    const hasDiabetesIndicator = diabetesIndicators.some(indicator => lowerText.includes(indicator));
    
    // SPECIAL RULE: Strong urine indicators
    const urineIndicators = [
      'urine analysis',
      'routine urine',
      'urine examination',
      'urinalysis',
      'pus cells',
      'epithelial cells',
      'specific gravity',
      'urine test'
    ];
    const hasUrineIndicator = urineIndicators.some(indicator => lowerText.includes(indicator));

    // Calculate scores for each report type
    for (const [reportType, config] of Object.entries(this.dictionary.reportTypes)) {
      let score = 0;

      // 1. Check for report type display name (strong indicator)
      if (lowerText.includes(config.displayName.toLowerCase())) {
        score += 5;
      }

      // 2. Check for report type aliases (strong indicator)
      if (config.aliases) {
        for (const alias of config.aliases) {
          if (lowerText.includes(alias.toLowerCase())) {
            score += 4;
          }
        }
      }

      // 3. Check for parameter display names (medium indicator)
      for (const [paramCode, paramData] of Object.entries(config.parameters || {})) {
        if (lowerText.includes(paramData.displayName.toLowerCase())) {
          score += 2;
        }

        // 4. Check for parameter synonyms (weak indicator, but still useful)
        for (const synonym of paramData.synonyms || []) {
          if (lowerText.includes(synonym.toLowerCase())) {
            score += 1;
          }
        }
      }

      // SPECIAL HANDLING: Boost DIABETES score if diabetes indicators present
      if (reportType === 'DIABETES' && hasDiabetesIndicator) {
        console.log('   🎯 Diabetes indicator found, boosting DIABETES score');
        score += 15; // Strong boost to ensure DIABETES wins
      }

      // SPECIAL HANDLING: Reduce URINE score if diabetes indicators present (avoid false positives)
      if (reportType === 'URINE' && hasDiabetesIndicator && !hasUrineIndicator) {
        console.log('   ⚠️  Diabetes indicator found but no urine indicators, reducing URINE score');
        score = Math.max(0, score - 10); // Reduce score to prevent false classification
      }

      scores[reportType] = score;
    }

    // Find the report type with highest score
    let maxScore = 0;
    let detectedType = null;

    for (const [reportType, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = reportType;
      }
    }

    // Require minimum score to prevent false positives
    if (maxScore < 3) {
      console.log('⚠️  No report type detected (score too low)');
      console.log('   Scores:', scores);
      return null;
    }

    console.log(`✅ Detected report type: ${detectedType} (score: ${maxScore})`);
    console.log('   Top 5 scores:', Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 5));

    return detectedType;
  }

  /**
   * Get parameter definitions for a specific report type
   * @param {string} reportType - Report type (e.g., 'DIABETES', 'KFT')
   * @returns {object|null} - Parameter definitions
   */
  getParameterDefinitions(reportType) {
    return this.dictionary.reportTypes[reportType] || null;
  }

  /**
   * Get all available report types
   * @returns {array} - List of report type codes
   */
  getAvailableReportTypes() {
    return Object.keys(this.dictionary.reportTypes || {});
  }

  /**
   * Get report type info
   * @param {string} reportType - Report type code
   * @returns {object|null} - Report type information
   */
  getReportTypeInfo(reportType) {
    const config = this.dictionary.reportTypes[reportType];
    if (!config) return null;

    return {
      code: reportType,
      name: config.displayName,
      parameterCount: config.parameters.length,
      keywords: config.keywords,
      parameters: config.parameters.map(p => ({
        name: p.name,
        unit: p.unit,
        referenceRange: p.referenceRange
      }))
    };
  }
}

// Singleton instance
module.exports = new ReportTypeDetector();
