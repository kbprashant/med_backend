/**
 * Report Processing Service - Handles complete report upload workflow
 * Orchestrates OCR, classification, extraction, and storage
 */

const { PrismaClient } = require('@prisma/client');
const ocrService = require('./ocrService');
const smartMedicalExtractor = require('./smartMedicalExtractor');
const smartMedicalExtractorV2 = require('./smartMedicalExtractorV2');
const { extractWithStrictValidation, extractMultipleReports } = require('./strictExtractionService');
const { evaluateParameterStatus } = require('../utils/statusEvaluator');
const testDefinitionService = require('./testDefinitionService');
const prisma = new PrismaClient();

class ReportProcessingService {
  /**
   * Process uploaded report - Main workflow
   * @param {string} userId - User ID
   * @param {string} ocrText - OCR extracted text from image/PDF
   * @param {string} filePath - File path where image/PDF is stored
   * @param {string} fileName - Original file name
   * @returns {Object} Created report with all related data
   */
  async processReport(userId, ocrText, filePath, fileName) {
    try {
      console.log('🔍 Starting report processing for user:', userId);

      // Step 1: Run intelligent extraction based on mode
      const extractionResult = await this.runSmartExtraction(ocrText);
      console.log('✅ Smart extraction completed:', {
        version: extractionResult.extractionVersion,
        parametersExtracted: extractionResult.parameters.length,
        averageConfidence: extractionResult.averageConfidence
      });

      // Step 2: Get additional metadata from OCR service (for backwards compatibility)
      const extractedData = await ocrService.processOcrText(ocrText);
      console.log('✅ OCR metadata extracted:', extractedData);

      // Step 3: Find or create lab center
      const centerType = extractedData.category === 'Imaging Reports' ? 'scan' : 'lab';
      const labCenter = await ocrService.findOrCreateLabCenter(
        extractedData.labCenter,
        centerType
      );

      // Step 4: Create report
      const report = await prisma.report.create({
        data: {
          userId,
          centerId: labCenter?.id,
          testType: extractedData.subcategory,
          reportDate: extractedData.reportDate,
          category: extractedData.category,
          subcategory: extractedData.subcategory,
          filePath,
          fileName,
          ocrText,
        },
      });
      console.log('✅ Report created:', report.id);

      // Step 5: Process test parameters using smart extraction results
      if (extractionResult.parameters.length > 0) {
        await this.createTestResultsFromSmartExtraction(
          report.id,
          extractionResult.parameters,
          extractedData.reportDate,
          extractionResult.extractionVersion,
          extractionResult.averageConfidence
        );
        console.log('✅ Test results created from smart extraction');
      }

      // Step 6: Generate health summary
      const healthSummary = await this.generateHealthSummary(userId, report.id);
      console.log('✅ Health summary generated');

      // Step 7: Return complete report data
      const completeReport = await prisma.report.findUnique({
        where: { id: report.id },
        include: {
          labCenter: true,
          testResults: true,
          healthSummaries: true,
        },
      });

      console.log('🎉 Report processing completed successfully');
      return completeReport;
    } catch (error) {
      console.error('❌ Error processing report:', error);
      throw error;
    }
  }

  /**
   * Run smart extraction based on EXTRACTION_MODE environment variable
   * @param {string} ocrText - OCR extracted text
   * @returns {Object} Extraction result with version info
   */
  async runSmartExtraction(ocrText) {
    const mode = process.env.EXTRACTION_MODE || 'STRICT';
    console.log(`🔬 Running extraction in ${mode} mode`);

    if (mode === 'V1') {
      return this.runV1Extraction(ocrText);
    } else if (mode === 'V2') {
      return this.runV2Extraction(ocrText);
    } else if (mode === 'HYBRID') {
      return this.runHybridExtraction(ocrText);
    } else if (mode === 'STRICT') {
      return this.runStrictExtraction(ocrText);
    } else {
      console.warn(`⚠️  Unknown extraction mode: ${mode}, falling back to STRICT`);
      return this.runStrictExtraction(ocrText);
    }
  }

  /**
   * Run V1 extraction only
   */
  async runV1Extraction(ocrText) {
    console.log('🔬 Running V1 Extractor');
    const result = smartMedicalExtractor.extract(ocrText);
    
    return this.formatExtractionResult(result, 'V1');
  }

  /**
   * Run V2 extraction only
   */
  async runV2Extraction(ocrText) {
    console.log('🔬 Running V2 Extractor');
    const result = await smartMedicalExtractorV2(ocrText);
    
    return this.formatV2ExtractionResult(result);
  }

  /**
   * Run STRICT extraction (with numeric validation and garbage rejection)
   * Supports multi-section reports (e.g., Lipid + Thyroid + LFT in one report)
   */
  async runStrictExtraction(ocrText) {
    console.log('🔬 Running STRICT Extractor (Numeric Validation + Garbage Rejection)');
    
    // Try multi-section extraction first
    const results = extractMultipleReports(ocrText);
    
    if (results.length === 1) {
      // Single section report - normal flow
      return this.formatStrictExtractionResult(results[0]);
    }
    
    // Multiple sections detected - combine them
    console.log(`\n🔀 Combining ${results.length} report sections...`);
    
    const combinedParameters = [];
    const combinedReportTypes = [];
    
    results.forEach((result, index) => {
      if (result.parameters && result.parameters.length > 0) {
        console.log(`   Section ${index + 1} (${result.reportType}): ${result.parameters.length} parameters`);
        combinedParameters.push(...result.parameters);
        combinedReportTypes.push(result.reportType);
      }
    });
    
    // Create a combined result
    const combinedResult = {
      success: combinedParameters.length > 0,
      reportType: combinedReportTypes.length > 0 ? combinedReportTypes.join(' + ') : 'UNKNOWN',
      parameters: combinedParameters,
      rejected: [],
      analysisComplete: true,
      requiresManualEntry: false,
      multiSectionReport: true,
      sections: combinedReportTypes
    };
    
    console.log(`✅ Combined report: ${combinedParameters.length} total parameters from ${combinedReportTypes.join(', ')}`);
    
    return this.formatStrictExtractionResult(combinedResult);
  }

  /**
   * Run both extractors and choose the best result
   */
  async runHybridExtraction(ocrText) {
    console.log('🔬 Running HYBRID Mode - Both Extractors');
    
    // Run both extractors in parallel
    const [v1Result, v2Result] = await Promise.all([
      Promise.resolve(smartMedicalExtractor.extract(ocrText)),
      smartMedicalExtractorV2(ocrText)
    ]);

    // Format both results
    const v1Formatted = this.formatExtractionResult(v1Result, 'V1');
    const v2Formatted = this.formatV2ExtractionResult(v2Result);

    // Compare and choose the best one
    const chosen = this.chooseBestExtraction(v1Formatted, v2Formatted);
    
    console.log(`✅ HYBRID Mode: Chose ${chosen.extractionVersion} extractor`);
    console.log(`   V1: ${v1Formatted.parameters.length} params, avg confidence: ${v1Formatted.averageConfidence.toFixed(2)}`);
    console.log(`   V2: ${v2Formatted.parameters.length} params, avg confidence: ${v2Formatted.averageConfidence.toFixed(2)}`);
    
    return chosen;
  }

  /**
   * Compare two extraction results and choose the better one
   * Criteria: 1) Number of parameters, 2) Average confidence
   */
  chooseBestExtraction(v1Result, v2Result) {
    const v1ParamCount = v1Result.parameters.length;
    const v2ParamCount = v2Result.parameters.length;
    const v1Confidence = v1Result.averageConfidence;
    const v2Confidence = v2Result.averageConfidence;

    // If one has no parameters, choose the other
    if (v1ParamCount === 0 && v2ParamCount > 0) return v2Result;
    if (v2ParamCount === 0 && v1ParamCount > 0) return v1Result;
    if (v1ParamCount === 0 && v2ParamCount === 0) return v1Result; // Default to V1

    // Calculate a weighted score: paramCount * 0.6 + confidence * 0.4
    const v1Score = (v1ParamCount * 0.6) + (v1Confidence * 0.4);
    const v2Score = (v2ParamCount * 0.6) + (v2Confidence * 0.4);

    console.log(`   V1 Score: ${v1Score.toFixed(2)} (${v1ParamCount} params × 0.6 + ${v1Confidence.toFixed(2)} conf × 0.4)`);
    console.log(`   V2 Score: ${v2Score.toFixed(2)} (${v2ParamCount} params × 0.6 + ${v2Confidence.toFixed(2)} conf × 0.4)`);

    return v2Score > v1Score ? v2Result : v1Result;
  }

  /**
   * Format extraction result into standard structure (for V1)
   */
  formatExtractionResult(result, version) {
    const parameters = result.success ? result.parameters : [];
    
    // Calculate average confidence
    let averageConfidence = 0;
    if (parameters.length > 0) {
      const totalConfidence = parameters.reduce((sum, p) => {
        return sum + (p.confidence || 1);
      }, 0);
      averageConfidence = totalConfidence / parameters.length;
    }

    return {
      reportType: this.detectReportType(parameters),
      parameters: parameters,
      extractionVersion: version,
      averageConfidence: averageConfidence
    };
  }

  /**
   * Format V2 extraction result (convert to V1-compatible format)
   */
  formatV2ExtractionResult(result) {
    // Convert V2 parameters to V1-compatible format
    // V2 has: { code, displayName, value, unit, status, confidence }
    // V1 expects: { parameter, value, unit, (optional) confidence }
    const v1CompatibleParams = result.parameters.map(param => ({
      parameter: param.displayName,  // Use displayName as parameter name
      value: param.value,
      unit: param.unit,
      confidence: param.confidence,
      status: param.status,           // Keep status for additional info
      code: param.code                // Keep code for reference
    }));

    return {
      reportType: result.reportType,
      parameters: v1CompatibleParams,
      extractionVersion: 'V2',
      averageConfidence: result.averageConfidence
    };
  }

  /**
   * Compute qualitative status for URINE_ANALYSIS ONLY
   * DO NOT use for other report types
   * 
   * @param {string} value - Qualitative value (e.g., "++", "NEGATIVE", "TRACE")
   * @returns {string|null} - "Normal" | "Borderline" | "Abnormal" | null
   */
  computeUrineQualitativeStatus(value) {
    if (!value) return null;

    const v = value.toUpperCase().trim();

    // Normal values
    if (v === 'NEGATIVE' || v === 'NORMAL' || v === 'CLEAR' || v === 'NIL') {
      return 'Normal';
    }

    // Borderline values
    if (v === 'TRACE') {
      return 'Borderline';
    }

    // Abnormal values (+ symbols)
    if (/^\+{1,4}$/.test(v)) {
      return 'Abnormal';
    }

    // Safe fallback for urine only (other qualitative values like "YELLOW", "TURBID")
    return 'Normal';
  }

  /**
   * Format STRICT extraction result (convert to V1-compatible format)
   */
  formatStrictExtractionResult(result) {
    // STRICT result has: { parameter, value, unit, type, extractionMethod, status (for URINE) }
    const reportType = result.reportType;
    
    const v1CompatibleParams = result.parameters.map(param => {
      // Start with base structure
      const formatted = {
        parameter: param.parameter,
        value: param.value,
        unit: param.unit,
        confidence: 1.0,  // STRICT extraction has binary confidence (either valid or rejected)
        status: param.status ?? null, // 🔧 FIX #1: Use nullish coalescing to avoid overriding falsy values
        validationType: param.type  // NUMERIC, QUALITATIVE, or MIXED
      };

      // 🔧 FIX #4: Include reference range if present
      if (param.referenceRange) {
        formatted.referenceRange = param.referenceRange;
      }

      // 🔧 FIX #2: Apply URINE-specific qualitative status computation
      // ONLY for URINE_ANALYSIS qualitative parameters
      if (reportType === 'URINE_ROUTINE' && param.type === 'QUALITATIVE') {
        const urineStatus = this.computeUrineQualitativeStatus(param.value);
        if (urineStatus !== null) {
          formatted.status = urineStatus;
        }
      }

      // 🔧 FIX #3: DO NOT set a default status here
      // Let the status remain null so extractionController can compute it properly
      // using determineStatus() with reference ranges
      // Only set default if there's absolutely no way to compute it (no reference range)

      return formatted;
    });

    // Log rejected parameters for debugging
    if (result.rejected && result.rejected.length > 0) {
      console.log(`\n⚠️  STRICT VALIDATION: Rejected ${result.rejected.length} parameters:`);
      result.rejected.forEach(r => {
        console.log(`   ❌ ${r.parameter}: "${r.rejectedValue}" - ${r.reason}`);
      });
    }

    return {
      reportType: result.reportType,
      parameters: v1CompatibleParams,
      extractionVersion: 'STRICT',
      averageConfidence: v1CompatibleParams.length > 0 ? 1.0 : 0,
      requiresManualEntry: result.requiresManualEntry || false,  // Propagate manual entry flag
      requiresManualReview: result.requiresManualReview || false,  // Propagate manual review flag
      analysisComplete: result.analysisComplete ?? true,  // Propagate analysis complete flag
      success: result.success ?? (v1CompatibleParams.length > 0),  // Propagate success flag
      message: result.message  // Propagate message (e.g., OCR quality issue)
    };
  }

  /**
   * Detect report type from extracted parameters
   */
  detectReportType(parameters) {
    if (parameters.length === 0) return 'Unknown';

    // Count parameter types
    const counts = {
      thyroid: 0,
      lipid: 0,
      cbc: 0,
      liver: 0,
      kidney: 0,
      diabetes: 0
    };

    parameters.forEach(p => {
      const lower = p.parameter.toLowerCase();
      if (/t3|t4|tsh|thyroid/i.test(lower)) counts.thyroid++;
      if (/cholesterol|hdl|ldl|vldl|triglyceride/i.test(lower)) counts.lipid++;
      if (/hemoglobin|wbc|rbc|platelet|hematocrit/i.test(lower)) counts.cbc++;
      if (/alt|ast|bilirubin|albumin|sgpt|sgot/i.test(lower)) counts.liver++;
      if (/creatinine|urea|bun|uric/i.test(lower)) counts.kidney++;
      if (/glucose|sugar|hba1c/i.test(lower)) counts.diabetes++;
    });

    // Find dominant type
    const max = Math.max(...Object.values(counts));
    if (max === 0) return 'General';

    const type = Object.keys(counts).find(key => counts[key] === max);
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Create test results from smart extraction with version tracking
   */
  async createTestResultsFromSmartExtraction(reportId, parameters, testDate, extractionVersion, averageConfidence) {
    try {
      const testResultsData = parameters.map(param => ({
        reportId,
        testCategory: 'Lab Test',
        testName: param.parameter,
        parameterName: param.parameter,
        value: String(param.value),
        unit: param.unit || '',
        status: this.determineStatus(param),
        referenceRange: param.referenceRange || '',
        testDate: testDate,
      }));

      await prisma.testResult.createMany({
        data: testResultsData,
      });

      console.log(`✅ Created ${testResultsData.length} test results using ${extractionVersion} extractor (avg confidence: ${averageConfidence.toFixed(2)})`);

      return testResultsData.length;
    } catch (error) {
      console.error('Error creating test results from smart extraction:', error);
      throw error;
    }
  }

  /**
   * Determine status for a parameter using universal status evaluator
   * Handles numeric and qualitative parameters across ALL test types
   * Looks up reference range from master data if not provided
   */
  determineStatus(param) {
    // If referenceRange is not provided or empty, try to look it up from master data
    if (!param.referenceRange || param.referenceRange.trim() === '') {
      try {
        const testDef = testDefinitionService.findByTestName(param.parameter || param.parameterName);
        if (testDef) {
          // Build reference range string from test definition
          if (testDef.is_qualitative) {
            param.referenceRange = testDef.risk_level_logic.normal;
          } else if (testDef.normal_min_value !== null && testDef.normal_max_value !== null) {
            param.referenceRange = `${testDef.normal_min_value}-${testDef.normal_max_value}`;
          }
        }
      } catch (error) {
        // If lookup fails, continue with empty reference range
        console.warn(`⚠️  Could not look up reference range for: ${param.parameter || param.parameterName}`);
      }
    }

    // Use universal status evaluator
    const status = evaluateParameterStatus(param);
    return status.toUpperCase();
  }

  /**
   * Create test results from extracted parameters
   */
  async createTestResults(reportId, parameters, testDate) {
    try {
      const testResultsData = parameters.map(param => ({
        reportId,
        testCategory: 'Lab Test',
        testName: param.parameterName,
        parameterName: param.parameterName,
        value: param.value,
        unit: param.unit || '',
        status: this.determineStatus(param),
        referenceRange: param.referenceRange || '',
        testDate: testDate,
      }));

      await prisma.testResult.createMany({
        data: testResultsData,
      });

      return testResultsData.length;
    } catch (error) {
      console.error('Error creating test results:', error);
      throw error;
    }
  }

  /**
   * Generate health summary for report
   */
  async generateHealthSummary(userId, reportId) {
    try {
      // Get all test results for this report
      const testResults = await prisma.testResult.findMany({
        where: { reportId },
      });

      // Count abnormal results
      const abnormalResults = testResults.filter(
        result => result.status === 'HIGH' || result.status === 'LOW'
      );

      // Determine overall status and risk level
      const abnormalCount = abnormalResults.length;
      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';

      if (abnormalCount > 0) {
        if (abnormalCount <= 2) {
          overallStatus = 'CAUTION';
          riskLevel = 'MEDIUM';
        } else {
          overallStatus = 'CRITICAL';
          riskLevel = 'HIGH';
        }
      }

      // Generate key issues
      const keyIssues = abnormalResults.map(result => ({
        parameter: result.parameterName,
        value: result.value,
        status: result.status,
        unit: result.unit,
      }));

      // Generate recommendations
      const recommendations = this.generateRecommendations(abnormalResults);

      // Generate summary text
      const summaryText = this.generateSummaryText(testResults, abnormalCount, overallStatus);

      // Create health summary
      const healthSummary = await prisma.healthSummary.create({
        data: {
          userId,
          reportId,
          summaryText,
          overallStatus,
          abnormalCount,
          riskLevel,
          keyIssues: JSON.stringify(keyIssues),
          recommendations: JSON.stringify(recommendations),
        },
      });

      return healthSummary;
    } catch (error) {
      console.error('Error generating health summary:', error);
      throw error;
    }
  }

  /**
   * Generate summary text from test results
   */
  generateSummaryText(testResults, abnormalCount, overallStatus) {
    if (testResults.length === 0) {
      return 'Report uploaded successfully. No test results available for analysis.';
    }

    const totalTests = testResults.length;
    const normalCount = totalTests - abnormalCount;

    let summary = `Your report contains ${totalTests} test parameter${totalTests > 1 ? 's' : ''}. `;
    
    if (abnormalCount === 0) {
      summary += 'All parameters are within normal range. ✓';
    } else {
      summary += `${normalCount} parameter${normalCount !== 1 ? 's are' : ' is'} normal, `;
      summary += `${abnormalCount} parameter${abnormalCount !== 1 ? 's need' : ' needs'} attention.`;
    }

    return summary;
  }

  /**
   * Generate recommendations based on abnormal results
   */
  generateRecommendations(abnormalResults) {
    const recommendations = [];

    if (abnormalResults.length === 0) {
      recommendations.push('Maintain your current healthy lifestyle');
      recommendations.push('Schedule regular checkups as advised by your doctor');
      return recommendations;
    }

    // General recommendations based on abnormal results
    recommendations.push('Consult your doctor to discuss these results');
    
    // Check for specific parameter recommendations
    abnormalResults.forEach(result => {
      const paramLower = result.parameterName.toLowerCase();
      
      if (paramLower.includes('hemoglobin') && result.status === 'LOW') {
        recommendations.push('Include iron-rich foods in your diet');
      }
      if (paramLower.includes('glucose') || paramLower.includes('sugar')) {
        recommendations.push('Monitor your blood sugar levels regularly');
      }
      if (paramLower.includes('cholesterol') || paramLower.includes('triglyceride')) {
        recommendations.push('Follow a heart-healthy diet and exercise routine');
      }
      if (paramLower.includes('vitamin')) {
        recommendations.push('Consider vitamin supplementation as advised by your doctor');
      }
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Get reports by category and subcategory
   */
  async getReportsByCategory(userId, category, subcategory) {
    try {
      const where = {
        userId,
        category,
      };

      if (subcategory) {
        where.subcategory = subcategory;
      }

      const reports = await prisma.report.findMany({
        where,
        include: {
          labCenter: true,
          testResults: true,
          healthSummaries: true,
        },
        orderBy: {
          reportDate: 'desc',
        },
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports by category:', error);
      throw error;
    }
  }

  /**
   * Get comparison data for multiple reports
   */
  async getComparisonData(reportIds) {
    try {
      const reports = await prisma.report.findMany({
        where: {
          id: { in: reportIds },
        },
        include: {
          testResults: {
            orderBy: { parameterName: 'asc' },
          },
        },
        orderBy: {
          reportDate: 'asc',
        },
      });

      // Build comparison matrix
      const comparisonData = this.buildComparisonMatrix(reports);
      
      return comparisonData;
    } catch (error) {
      console.error('Error getting comparison data:', error);
      throw error;
    }
  }

  /**
   * Build comparison matrix from reports
   */
  buildComparisonMatrix(reports) {
    if (reports.length === 0) return { parameters: [], dates: [], data: [] };

    // Get all unique parameter names
    const parameterSet = new Set();
    reports.forEach(report => {
      report.testResults.forEach(result => {
        parameterSet.add(result.parameterName);
      });
    });

    const parameters = Array.from(parameterSet).sort();
    const dates = reports.map(r => r.reportDate);

    // Build matrix
    const data = parameters.map(paramName => {
      const row = {
        parameter: paramName,
        values: [],
      };

      reports.forEach(report => {
        const result = report.testResults.find(r => r.parameterName === paramName);
        row.values.push({
          value: result ? result.value : '-',
          unit: result ? result.unit : '',
          status: result ? result.status : 'N/A',
          date: report.reportDate,
        });
      });

      return row;
    });

    return { parameters, dates, data };
  }

  /**
   * Compare two specific reports
   */
  async compareTwoReports(reportId1, reportId2) {
    try {
      const comparisonData = await this.getComparisonData([reportId1, reportId2]);
      
      // Calculate changes for each parameter
      const comparison = comparisonData.data.map(row => {
        const value1 = parseFloat(row.values[0].value);
        const value2 = parseFloat(row.values[1].value);

        let change = null;
        let percentChange = null;
        let trend = 'STABLE';

        if (!isNaN(value1) && !isNaN(value2)) {
          change = value2 - value1;
          percentChange = ((change / value1) * 100).toFixed(2);
          trend = change > 0 ? 'INCREASE' : change < 0 ? 'DECREASE' : 'STABLE';
        }

        return {
          parameter: row.parameter,
          oldValue: row.values[0],
          newValue: row.values[1],
          change,
          percentChange,
          trend,
        };
      });

      return comparison;
    } catch (error) {
      console.error('Error comparing reports:', error);
      throw error;
    }
  }
}

module.exports = new ReportProcessingService();
