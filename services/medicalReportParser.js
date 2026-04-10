/**
 * Medical Report Parser - Main Orchestrator
 * 
 * This is the main parser that orchestrates the entire parsing process:
 * 1. Detect report type FIRST
 * 2. Load parameter definitions for that type
 * 3. Extract parameters using label-based extraction
 * 4. Return structured output
 * 
 * Architecture:
 * - reportTypeDetector: Detects report type from OCR text
 * - labelBasedExtractor: Extracts values using label-based search
 * - dateExtractor: Extracts report date
 */

const reportTypeDetector = require('./reportTypeDetector');
const labelBasedExtractor = require('./labelBasedExtractor');

class MedicalReportParser {
  /**
   * Main parsing function
   * @param {string} ocrText - Raw OCR text from lab report
   * @returns {object} - Structured report data
   */
  parseReport(ocrText) {
    console.log('\n' + '='.repeat(70));
    console.log('🏥 MEDICAL REPORT PARSER - Starting Analysis');
    console.log('='.repeat(70));

    if (!ocrText || ocrText.trim().length < 10) {
      return this.createErrorResponse('OCR text too short or empty');
    }

    console.log(`📄 OCR Text Length: ${ocrText.length} characters`);

    // STEP 1: DETECT REPORT TYPE FIRST (before any extraction)
    console.log('\n📊 STEP 1: Detecting Report Type...');
    const reportType = reportTypeDetector.detectReportType(ocrText);
    
    if (!reportType) {
      return this.createErrorResponse('Could not detect report type from OCR text');
    }

    // STEP 2: LOAD PARAMETER DEFINITIONS for the detected type
    console.log('\n📋 STEP 2: Loading Parameter Definitions...');
    const parameterDefs = reportTypeDetector.getParameterDefinitions(reportType);
    
    if (!parameterDefs) {
      return this.createErrorResponse(`No parameter definitions found for ${reportType}`);
    }

    console.log(`   Loaded ${parameterDefs.parameters.length} parameters for ${parameterDefs.name}`);

    // STEP 3: EXTRACT REPORT DATE
    console.log('\n📅 STEP 3: Extracting Report Date...');
    const reportDate = this.extractReportDate(ocrText);
    console.log(`   Date: ${reportDate || 'Not found'}`);

    // STEP 4: EXTRACT PARAMETERS using LABEL-BASED search
    console.log('\n🔬 STEP 4: Extracting Parameters (Label-Based)...');
    const parameters = labelBasedExtractor.extractParameters(ocrText, parameterDefs);

    // STEP 5: BUILD STRUCTURED OUTPUT
    const result = {
      success: true,
      reportType: reportType,
      reportTypeName: parameterDefs.name,
      reportDate: reportDate,
      totalParameters: parameterDefs.parameters.length,
      extractedParameters: parameters.filter(p => p.value !== null).length,
      parameters: parameters
    };

    // STEP 6: SUMMARY
    this.printSummary(result);

    return result;
  }

  /**
   * Extract report date from OCR text
   * @param {string} ocrText - OCR text
   * @returns {string|null} - Extracted date
   */
  extractReportDate(ocrText) {
    const datePatterns = [
      // DD-MM-YYYY or DD/MM/YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      // DD Mon YYYY (e.g., 13 Feb 2026)
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      // YYYY-MM-DD
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = ocrText.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @returns {object} - Error response
   */
  createErrorResponse(message) {
    console.log(`\n❌ ERROR: ${message}`);
    return {
      success: false,
      error: message,
      reportType: null,
      parameters: []
    };
  }

  /**
   * Print extraction summary
   * @param {object} result - Parsing result
   */
  printSummary(result) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Report Type: ${result.reportTypeName} (${result.reportType})`);
    console.log(`Report Date: ${result.reportDate || 'Not found'}`);
    console.log(`Success Rate: ${result.extractedParameters}/${result.totalParameters} parameters (${Math.round(result.extractedParameters / result.totalParameters * 100)}%)`);
    console.log('\nExtracted Parameters:');
    
    const validParams = result.parameters.filter(p => p.value !== null);
    const missedParams = result.parameters.filter(p => p.value === null);

    validParams.forEach((param, index) => {
      const statusEmoji = param.status === 'Normal' ? '✅' : param.status === 'High' ? '⬆️' : param.status === 'Low' ? '⬇️' : '❓';
      console.log(`  ${index + 1}. ${param.parameter.padEnd(30)} ${param.value} ${param.unit.padEnd(10)} ${statusEmoji} ${param.status}`);
    });

    if (missedParams.length > 0) {
      console.log('\nMissed Parameters:');
      missedParams.forEach((param, index) => {
        console.log(`  ${index + 1}. ${param.parameter} - Not found in OCR text`);
      });
    }

    console.log('='.repeat(70));
  }

  /**
   * Get available report types
   * @returns {array} - List of report types
   */
  getAvailableReportTypes() {
    return reportTypeDetector.getAvailableReportTypes();
  }

  /**
   * Get report type information
   * @param {string} reportType - Report type code
   * @returns {object|null} - Report type info
   */
  getReportTypeInfo(reportType) {
    return reportTypeDetector.getReportTypeInfo(reportType);
  }
}

// Singleton instance
module.exports = new MedicalReportParser();
