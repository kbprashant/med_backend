/**
 * Extraction Controller
 * 
 * Handles schema-based report extraction requests
 * Endpoints:
 * - POST /api/extraction/analyze - Analyze OCR text and extract parameters
 * - POST /api/extraction/confirm-save - Save analyzed report to database
 * - POST /api/extraction/manual-save - Manually save report with user-entered data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const medicalReportParser = require('../services/medicalReportParser');
const smartMedicalExtractor = require('../services/smartMedicalExtractor');
const reportProcessingService = require('../services/reportProcessingService');
const healthAnalysisService = require('../services/healthAnalysisService');
const { normalizeExtractedData } = require('../services/normalizer');
const referenceRanges = require('../services/referenceRanges');
const { autoPopulateMasterTables } = require('../services/masterDataService');
const { evaluateParameterStatus } = require('../utils/statusEvaluator');
const testDefinitionService = require('../services/testDefinitionService');
const { sendNotificationToUser } = require('../services/pushNotificationService');

/**
 * POST /api/extraction/analyze
 * 
 * Analyze OCR text and extract parameters using SmartMedicalExtractor
 * 
 * Request Body:
 * {
 *   ocrText: string (required) - Raw OCR text from medical report
 *   reportDate: string (optional) - ISO date string
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   analysisComplete: true,
 *   requiresManualEntry: false,
 *   reportType: "CBC",
 *   reportTypeName: "Complete Blood Count",
 *   homeCategory: "Blood Tests",
 *   parameters: [...],
 *   totalParameters: 9,
 *   extractedParameters: 9,
 *   confidence: 100,
 *   reportDate: "2026-02-17T13:34:40.185Z"
 * }
 */
async function analyzeReport(req, res) {
  try {
    const { ocrText, reportDate } = req.body;

    // Validate required field: ocrText
    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length === 0) {
      console.error('❌ Validation Error: OCR text is missing or invalid');
      return res.status(400).json({
        success: false,
        message: 'OCR text is required and must be a non-empty string'
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔍 EXTRACTION API - Analyze Report (Smart Extraction)');
    console.log('='.repeat(70));
    console.log(`📄 OCR Text Length: ${ocrText.length} characters`);
    console.log(`📅 Report Date: ${reportDate || 'Not provided (using current date)'}`);
    console.log(`🔬 Extraction Mode: ${process.env.EXTRACTION_MODE || 'V1 (default)'}`);

    // Step 1: Extract parameters using Smart Extraction (with EXTRACTION_MODE support)
    console.log('\n📊 Starting Smart Extraction...');
    const smartExtractionResult = await reportProcessingService.runSmartExtraction(ocrText);

    console.log(`\n✅ Smart Extraction Result:`);
    console.log(`   Version Used: ${smartExtractionResult.extractionVersion}`);
    console.log(`   Report Type: ${smartExtractionResult.reportType}`);
    console.log(`   Parameters Found: ${smartExtractionResult.parameters.length}`);
    console.log(`   Average Confidence: ${smartExtractionResult.averageConfidence.toFixed(2)}`);
    
    // Check if extraction flagged for manual entry (e.g., OCR quality issues)
    if (smartExtractionResult.requiresManualEntry) {
      console.log('\n⚠️  Extraction flagged for MANUAL ENTRY');
      console.log(`   Reason: ${smartExtractionResult.message || 'OCR quality issue'}`);
      
      return res.status(200).json({
        success: false,
        analysisComplete: false,
        requiresManualEntry: true,
        reportType: smartExtractionResult.reportType || 'UNKNOWN',
        reportTypeName: getReportTypeName(smartExtractionResult.reportType || 'UNKNOWN'),
        homeCategory: getCategory(smartExtractionResult.reportType || 'UNKNOWN'),
        message: smartExtractionResult.message || 'Unable to extract values automatically. Please enter values manually.',
        parameters: [],
        totalParameters: 0,
        extractedParameters: 0,
        confidence: 0,
        reportDate: reportDate || new Date().toISOString(),
        ocrText: ocrText
      });
    }

    // Convert to V1-compatible format for backward compatibility
    const extractionResult = {
      success: smartExtractionResult.parameters.length > 0,
      parameters: smartExtractionResult.parameters,
      reportType: smartExtractionResult.reportType,
      message: smartExtractionResult.parameters.length === 0 ? 'No parameters extracted' : undefined
    };
    
    // Step 2: Apply normalization and deduplication
    let finalParameters = [];
    if (extractionResult.success && extractionResult.parameters && extractionResult.parameters.length > 0) {
      console.log(`\n🔄 Normalizing ${extractionResult.parameters.length} raw parameters...`);
      finalParameters = normalizeExtractedData(extractionResult.parameters);
      console.log(`✨ After normalization: ${finalParameters.length} unique parameters`);
      
      // Step 2.5: Evaluate status for each parameter using universal status evaluator
      // 🔧 FIX: Preserve status if already computed (e.g., from URINE extraction qualitative logic)
      console.log(`\n🎯 Evaluating status for ${finalParameters.length} parameters...`);
      finalParameters = finalParameters.map(param => {
        // Only recalculate status if not already set or invalid
        let finalStatus = param.status;
        if (!finalStatus || typeof finalStatus !== 'string' || 
            !['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'BORDERLINE', 'Normal', 'Abnormal', 'High', 'Low', 'Borderline'].includes(finalStatus)) {
          finalStatus = determineStatus(param);
        } else {
          // Normalize existing status to uppercase
          finalStatus = finalStatus.toUpperCase();
          if (finalStatus === 'BORDERLINE') finalStatus = 'ABNORMAL';
        }
        console.log(`   ${param.parameter}: ${param.value} ${param.unit || ''} (ref: ${param.referenceRange || 'N/A'}) → ${finalStatus}`);
        return {
          ...param,
          status: finalStatus
        };
      });
    }

    // Step 3: Handle case where no parameters were extracted
    // IMPORTANT: Respect the extraction service's decision on requiresManualEntry and analysisComplete
    if (finalParameters.length === 0) {
      // Use report type from extraction result (may be detected even without parameters)
      const detectedReportType = smartExtractionResult.reportType || extractionResult.reportType || 'UNKNOWN';
      const analysisComplete = smartExtractionResult.analysisComplete ?? false;
      const requiresManualEntry = smartExtractionResult.requiresManualEntry ?? true;
      
      console.log('\n⚠️  No valid parameters extracted');
      console.log(`   Report Type: ${detectedReportType}`);
      console.log(`   Analysis Complete: ${analysisComplete}`);
      console.log(`   Requires Manual Entry: ${requiresManualEntry}`);
      
      return res.status(200).json({
        success: smartExtractionResult.success ?? false,
        analysisComplete: analysisComplete,
        requiresManualEntry: requiresManualEntry,
        reportType: detectedReportType,
        reportTypeName: getReportTypeName(detectedReportType),
        homeCategory: getCategory(detectedReportType),
        message: smartExtractionResult.message || extractionResult.message || 'No valid medical parameters found in OCR text',
        parameters: [],
        totalParameters: 0,
        extractedParameters: 0,
        confidence: 0,
        reportDate: reportDate || new Date().toISOString(),
        ocrText: ocrText
      });
    }

    // Step 4: Detect report type from extracted parameters (preferred) or OCR text (fallback)
    const reportType = detectReportTypeFromParameters(finalParameters, ocrText);
    const reportTypeName = getReportTypeName(reportType);
    const homeCategory = getCategory(reportType);

    // Step 5: Calculate confidence based on extracted parameters
    const confidence = calculateConfidence(finalParameters);

    console.log('\n✅ Analysis Complete:');
    console.log(`   Report Type: ${reportType} (${reportTypeName})`);
    console.log(`   Home Category: ${homeCategory}`);
    console.log(`   Total Parameters: ${finalParameters.length}`);
    console.log(`   Confidence: ${confidence}%`);
    console.log('='.repeat(70) + '\n');

    // Step 6: Return formatted response
    return res.status(200).json({
      success: true,
      analysisComplete: true,
      requiresManualEntry: false,
      reportType: reportType,
      reportTypeName: reportTypeName,
      homeCategory: homeCategory,
      parameters: finalParameters,
      totalParameters: finalParameters.length,
      extractedParameters: finalParameters.length,
      confidence: confidence,
      reportDate: reportDate || new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in analyzeReport:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      analysisComplete: false,
      requiresManualEntry: true,
      message: 'An internal server error occurred during analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Helper: Detect report type from extracted parameters (PREFERRED METHOD)
 * This provides more accurate classification than OCR text keyword matching
 * 
 * @param {Array} parameters - Extracted parameters with {parameter, value, unit} structure
 * @param {string} ocrText - Raw OCR text (fallback for keyword detection)
 * @returns {string} - Report type code
 */
function detectReportTypeFromParameters(parameters, ocrText) {
  if (!parameters || parameters.length === 0) {
    return detectReportType(ocrText); // Fallback to OCR text detection
  }

  // Normalize parameter names for comparison
  const paramNames = parameters.map(p => p.parameter.toLowerCase().trim());

  console.log(`\n🔬 Parameter-based classification:`);
  console.log(`   Extracted parameters: ${paramNames.join(', ')}`);

  // RULE 1: KFT - Contains Urea OR Creatinine
  const hasUrea = paramNames.some(name => /\burea\b/i.test(name));
  const hasCreatinine = paramNames.some(name => /creatinine/i.test(name));
  const hasUricAcid = paramNames.some(name => /uric\s*acid/i.test(name));
  
  if (hasUrea || hasCreatinine || hasUricAcid) {
    console.log(`   ✅ Classified as KFT (has kidney markers: urea/creatinine/uric acid)`);
    return 'KFT';
  }

  // RULE 2: URINE_ANALYSIS - Contains urine-specific parameters (CHECK EARLY - BEFORE BLOOD_SUGAR)
  // Urine reports often have "Glucose" which can incorrectly trigger BLOOD_SUGAR
  const hasPH = paramNames.some(name => /\bph\b/i.test(name));
  const hasSpecificGravity = paramNames.some(name => /specific\s*gravity|sp\s*gr/i.test(name));
  const hasPusCells = paramNames.some(name => /pus\s*cell/i.test(name));
  const hasEpithelialCells = paramNames.some(name => /epithelial\s*cell/i.test(name));
  const hasCasts = paramNames.some(name => /\bcast/i.test(name));
  const hasCrystals = paramNames.some(name => /\bcrystal/i.test(name));
  const hasUrobilinogen = paramNames.some(name => /urobilinogen/i.test(name));
  const hasKetone = paramNames.some(name => /\bketone/i.test(name));
  const hasColour = paramNames.some(name => /\bcolou?r\b/i.test(name));
  const hasAppearance = paramNames.some(name => /\bappearance\b/i.test(name));
  
  const urineParamCount = [hasPH, hasSpecificGravity, hasPusCells, hasEpithelialCells, hasCasts, hasCrystals, hasUrobilinogen, hasKetone, hasColour, hasAppearance].filter(Boolean).length;
  
  if (urineParamCount >= 3) {
    console.log(`   ✅ Classified as URINE_ANALYSIS (has ${urineParamCount} urine-specific parameters)`);
    return 'URINE_ANALYSIS';
  }

  // RULE 3: ELECTROLYTES - Contains Sodium/Potassium/Chloride but NO kidney markers
  const hasSodium = paramNames.some(name => /sodium|^na[\s\(]/i.test(name));
  const hasPotassium = paramNames.some(name => /potassium|^k[\s\(]/i.test(name));
  const hasChloride = paramNames.some(name => /chloride|^cl[\s\(-]/i.test(name));
  const hasBicarbonate = paramNames.some(name => /bicarbonate|hco3/i.test(name));
  const hasCalcium = paramNames.some(name => /calcium|^ca[\s\(]/i.test(name));
  const hasMagnesium = paramNames.some(name => /magnesium|^mg[\s\(]/i.test(name));
  
  const electrolyteCount = [hasSodium, hasPotassium, hasChloride, hasBicarbonate, hasCalcium, hasMagnesium].filter(Boolean).length;
  
  if (electrolyteCount >= 3) {
    console.log(`   ✅ Classified as ELECTROLYTES (has ${electrolyteCount} electrolyte parameters, no kidney markers)`);
    return 'ELECTROLYTES';
  }

  // RULE 4: THYROID - Contains T3/T4/TSH
  const hasT3 = paramNames.some(name => /\bt3\b|triiodothyronine/i.test(name));
  const hasT4 = paramNames.some(name => /\bt4\b|thyroxine/i.test(name));
  const hasTSH = paramNames.some(name => /\btsh\b|thyroid\s*stimulating/i.test(name));
  
  if ((hasT3 || hasT4) && hasTSH) {
    console.log(`   ✅ Classified as THYROID (has thyroid hormones)`);
    return 'THYROID';
  }

  // RULE 5: LIPID - Contains Cholesterol/HDL/LDL/Triglycerides
  const hasCholesterol = paramNames.some(name => /cholesterol/i.test(name));
  const hasHDL = paramNames.some(name => /\bhdl\b/i.test(name));
  const hasLDL = paramNames.some(name => /\bldl\b/i.test(name));
  const hasTriglycerides = paramNames.some(name => /triglyceride/i.test(name));
  
  if ((hasCholesterol || hasHDL || hasLDL || hasTriglycerides) && 
      [hasCholesterol, hasHDL, hasLDL, hasTriglycerides].filter(Boolean).length >= 2) {
    console.log(`   ✅ Classified as LIPID (has lipid markers)`);
    return 'LIPID';
  }

  // RULE 6: BLOOD SUGAR - Contains Glucose/Blood Sugar (check AFTER urine to avoid false positives)
  const hasGlucose = paramNames.some(name => /glucose|blood\s*sugar|fasting|ppbs|hba1c/i.test(name));
  
  if (hasGlucose) {
    console.log(`   ✅ Classified as BLOOD_SUGAR (has glucose markers)`);
    return 'BLOOD_SUGAR';
  }

  // RULE 7: CBC - Contains Hemoglobin/RBC/WBC/Platelets
  const hasHemoglobin = paramNames.some(name => /hemoglobin|haemoglobin|\bhb\b/i.test(name));
  const hasRBC = paramNames.some(name => /\brbc\b|red\s*blood\s*cell|erythrocyte/i.test(name));
  const hasWBC = paramNames.some(name => /\bwbc\b|white\s*blood\s*cell|leukocyte|leucocyte/i.test(name));
  const hasPlatelets = paramNames.some(name => /platelet|thrombocyte/i.test(name));
  
  if ([hasHemoglobin, hasRBC, hasWBC, hasPlatelets].filter(Boolean).length >= 2) {
    console.log(`   ✅ Classified as CBC (has blood count markers)`);
    return 'CBC';
  }

  // RULE 8: LFT - Contains SGPT/SGOT/Bilirubin (with word boundaries to avoid false matches)
  const hasSGPT = paramNames.some(name => /\bsgpt\b|\balt\b|alanine/i.test(name));
  const hasSGOT = paramNames.some(name => /\bsgot\b|\bast\b|aspartate/i.test(name));
  const hasBilirubin = paramNames.some(name => /bilirubin/i.test(name));
  
  if ((hasSGPT || hasSGOT || hasBilirubin) && 
      [hasSGPT, hasSGOT, hasBilirubin].filter(Boolean).length >= 2) {
    console.log(`   ✅ Classified as LFT (has liver markers)`);
    return 'LFT';
  }

  // RULE 9: VITAMIN_D - Contains Vitamin D
  const hasVitaminD = paramNames.some(name => /vitamin\s*d|25.*hydroxy/i.test(name));
  
  if (hasVitaminD) {
    console.log(`   ✅ Classified as VITAMIN_D (has vitamin D marker)`);
    return 'VITAMIN_D';
  }

  // Fallback: Use OCR text keyword detection
  console.log(`   ⚠️  No parameter-based match, falling back to OCR text keyword detection`);
  return detectReportType(ocrText);
}

/**
 * Helper: Detect report type from OCR text using keyword matching
 * @param {string} ocrText - Raw OCR text
 * @returns {string} - Report type code (CBC, LIPID, THYROID, LFT, KFT, or UNKNOWN)
 */
function detectReportType(ocrText) {
  const textLower = ocrText.toLowerCase();

  // Blood Sugar / Diabetes Test
  const bloodSugarKeywords = ['blood sugar', 'glucose', 'fasting', 'postprandial', 'post prandial', 'ppbs', 'fbs', 'random blood sugar', 'rbs', 'hba1c', 'glycosylated'];
  const bloodSugarCount = bloodSugarKeywords.filter(kw => textLower.includes(kw)).length;

  // CBC - Complete Blood Count
  const cbcKeywords = ['hemoglobin', 'hb', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'complete blood count', 'cbc'];
  const cbcCount = cbcKeywords.filter(kw => textLower.includes(kw)).length;

  // Lipid Profile
  const lipidKeywords = ['cholesterol', 'hdl', 'ldl', 'vldl', 'triglyceride', 'lipid profile', 'lipid'];
  const lipidCount = lipidKeywords.filter(kw => textLower.includes(kw)).length;

  // Thyroid Function Test
  const thyroidKeywords = ['t3', 't4', 'tsh', 'thyroid', 'triiodothyronine', 'thyroxine', 'thyroid stimulating'];
  const thyroidCount = thyroidKeywords.filter(kw => textLower.includes(kw)).length;

  // Liver Function Test (STRICT - must have actual liver enzymes)
  const lftKeywords = ['sgpt', 'sgot', '\balt\b', '\bast\b', 'alanine aminotransferase', 'aspartate aminotransferase', 'alkaline phosphatase', '\balp\b', 'liver function', 'lft'];
  const lftCount = lftKeywords.filter(kw => new RegExp(kw, 'i').test(textLower)).length;

  // Electrolytes - CHECK BEFORE KFT (more specific)
  const electrolyteKeywords = ['electrolytes', 'electrolyte panel', 'electrolyte test'];
  const electrolyteCount = electrolyteKeywords.filter(kw => textLower.includes(kw)).length;
  // Also check for presence of multiple electrolyte markers
  const hasMultipleElectrolytes = ['sodium', 'potassium', 'chloride', 'bicarbonate', 'magnesium', 'calcium']
    .filter(kw => textLower.includes(kw)).length >= 3;
  const electrolyteScore = electrolyteCount > 0 ? 5 : (hasMultipleElectrolytes ? 3 : 0);

  // Kidney Function Test (separate from Electrolytes)
  const kftKeywords = ['creatinine', 'urea', 'bun', 'uric acid', 'egfr', 'kidney function', 'kft', 'renal function', 'rft'];
  const kftCount = kftKeywords.filter(kw => textLower.includes(kw)).length;

  // Vitamin D
  const vitaminDKeywords = ['vitamin d', 'vit d', '25-hydroxy', '25 hydroxy', 'cholecalciferol', 'ergocalciferol'];
  const vitaminDCount = vitaminDKeywords.filter(kw => textLower.includes(kw)).length;

  // Urine Analysis
  const urineKeywords = ['urine', 'routine urine', 'urine examination', 'urinalysis', 'specific gravity', 'pus cells', 'epithelial cells', 'casts', 'crystals'];
  const urineCount = urineKeywords.filter(kw => textLower.includes(kw)).length;

  // Find the type with highest keyword matches
  const scores = {
    BLOOD_SUGAR: bloodSugarCount,
    CBC: cbcCount,
    LIPID: lipidCount,
    THYROID: thyroidCount,
    LFT: lftCount,
    ELECTROLYTES: electrolyteScore,  // Check ELECTROLYTES before KFT
    KFT: kftCount,
    VITAMIN_D: vitaminDCount,
    URINE_ANALYSIS: urineCount
  };

  let maxScore = 0;
  let detectedType = 'UNKNOWN';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  }

  // Require at least 2 keyword matches to confidently classify
  if (maxScore < 2) {
    detectedType = 'UNKNOWN';
  }

  console.log(`🔍 Report Type Detection: ${detectedType} (score: ${maxScore})`);
  return detectedType;
}

/**
 * Helper: Get human-readable report type name
 * @param {string} type - Report type code
 * @returns {string} - Full report name
 */
function getReportTypeName(type) {
  const typeNames = {
    'BLOOD_SUGAR': 'Blood Sugar Test',
    'CBC': 'Complete Blood Count',
    'LIPID_PROFILE': 'Lipid Profile',  // Fixed: matches strictExtractionService
    'THYROID': 'Thyroid Function Test',
    'LIVER_FUNCTION': 'Liver Function Test',  // Fixed: was 'LFT'
    'KIDNEY_FUNCTION': 'Kidney Function Test',  // Fixed: was 'KFT'
    'URINE_ROUTINE': 'Urine Analysis',  // Fixed: was 'URINE_ANALYSIS'
    'ELECTROLYTES': 'Electrolytes Panel',
    'VITAMIN_D': 'Vitamin D Test',
    'LFT': 'Liver Function Test',  // Backward compatibility
    'KFT': 'Kidney Function Test',  // Backward compatibility
    'URINE_ANALYSIS': 'Urine Analysis',  // Backward compatibility
    'LIPID': 'Lipid Profile',  // Backward compatibility
    'UNKNOWN': 'General Lab Report'
  };

  return typeNames[type] || 'General Lab Report';
}

/**
 * Helper: Get home category for report type
 * @param {string} type - Report type code
 * @returns {string} - Home category
 */
function getCategory(type) {
  const categoryMap = {
    'BLOOD_SUGAR': 'Diabetes Tests',
    'CBC': 'Blood Tests',
    'LIPID_PROFILE': 'Lipid Profile',  // Fixed: matches strictExtractionService
    'THYROID': 'Hormone Tests',
    'LIVER_FUNCTION': 'Liver Tests',  // Fixed: was 'LFT'
    'KIDNEY_FUNCTION': 'Kidney Tests',  // Fixed: was 'KFT'
    'URINE_ROUTINE': 'Urine Tests',  // Fixed: was 'URINE_ANALYSIS'
    'ELECTROLYTES': 'Electrolyte Tests',
    'VITAMIN_D': 'Vitamin Tests',
    'LFT': 'Liver Tests',  // Backward compatibility
    'KFT': 'Kidney Tests',  // Backward compatibility
    'URINE_ANALYSIS': 'Urine Tests',  // Backward compatibility
    'LIPID': 'Lipid Profile',  // Backward compatibility
    'UNKNOWN': 'General'
  };

  return categoryMap[type] || 'General';
}

/**
 * Helper: Calculate confidence score based on number of extracted parameters
 * @param {Array} parameters - Array of extracted parameters
 * @returns {number} - Confidence percentage (0-100)
 */
function calculateConfidence(parameters) {
  if (!parameters || parameters.length === 0) {
    return 0;
  }

  const count = parameters.length;

  if (count >= 8) {
    return 100;
  } else if (count >= 4) {
    return 75;
  } else if (count >= 1) {
    return 50;
  }

  return 0;
}

/**
 * POST /api/extraction/confirm-save
 * 
 * Save analyzed report to database
 * 
 * Request Body:
 * {
 *   reportType: string (required) - Report type (e.g., "GLUCOSE")
 *   reportDate: string (required) - ISO date string
 *   parameters: array (required) - Extracted parameters
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   report: { id, ... },
 *   testResults: [...]
 * }
 */
async function confirmAndSave(req, res) {
  try {
    const { reportType, reportDate, parameters, ocrText } = req.body;
    const userId = req.user.id; // From authenticate middleware

    // Validate required fields
    if (!reportType || !reportDate || !parameters) {
      return res.status(400).json({
        success: false,
        message: 'reportType, reportDate, and parameters are required'
      });
    }

    if (!Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'parameters must be a non-empty array'
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('💾 EXTRACTION API - Confirm and Save');
    console.log('='.repeat(70));
    console.log(`👤 User ID: ${userId}`);
    console.log(`📋 Report Type: ${reportType}`);
    console.log(`📅 Report Date: ${reportDate}`);
    console.log(`🧪 Parameters: ${parameters.length}`);
    console.log(`📄 OCR Text: ${ocrText ? ocrText.length + ' chars' : 'Not provided'}`);

    // Apply normalization to parameters before saving
    console.log(`📝 Raw parameters: ${parameters.length}`);
    const normalizedParams = normalizeExtractedData(parameters);
    console.log(`✨ Normalized parameters: ${normalizedParams.length} unique`);

    // Map report type to category/subcategory
    const { category, subcategory, testName } = mapReportTypeToMetadata(reportType);

    // Auto-populate master tables (test_master, test_parameters, test_definitions, lab_centers)
    const masterData = await autoPopulateMasterTables(
      { testName, category, subcategory },
      ocrText || '',
      normalizedParams
    );

    // Create report with OCR text and link to lab center
    const report = await prisma.report.create({
      data: {
        userId: userId,
        centerId: masterData.labCenterId, // Link to lab center if found
        testType: testName,
        reportDate: new Date(reportDate),
        category: category,
        subcategory: subcategory,
        fileName: `${testName}_${new Date(reportDate).toISOString().split('T')[0]}.pdf`,
        ocrText: ocrText || null,
      }
    });

    console.log(`✅ Report created: ${report.id}`);

    // Save test results with links to master tables
    const testResults = [];
    
    for (let i = 0; i < normalizedParams.length; i++) {
      const param = normalizedParams[i];
      
      // Only save parameters with values
      if (param.value === null || param.value === '') {
        continue;
      }

      // Get corresponding master data IDs
      const processedParam = masterData.processedParams[i];

      // Determine status
      const status = determineStatus(param);

      const testResult = await prisma.testResult.create({
        data: {
          reportId: report.id,
          testDefinitionId: processedParam?.testDefinitionId, // Link to test_definitions
          parameterId: processedParam?.testParameterId,      // Link to test_parameters
          testCategory: category,
          testSubCategory: subcategory,
          testName: testName,
          parameterName: param.parameter,
          value: String(param.value),
          unit: param.unit || '',
          status: status,
          referenceRange: param.referenceRange || '',
          normalMin: param.normalMin || null,
          normalMax: param.normalMax || null,
          testDate: new Date(reportDate),
        }
      });

      testResults.push(testResult);
    }

    console.log(`✅ Saved ${testResults.length} test results with master table links`);

    // Generate health summary automatically
    console.log('\n📊 Generating health summary...');
    try {
      const healthSummary = await generateHealthSummaryForReport(userId, report.id, testResults);
      console.log(`✅ Health summary created: ${healthSummary.id}`);
    } catch (summaryError) {
      console.log('⚠️  Could not generate health summary (non-critical):', summaryError.message);
    }

    // Send notification to patient that their report was uploaded
    sendNotificationToUser(
      userId,
      'Medical Report Uploaded',
      `Your ${testName} report from ${new Date(reportDate).toLocaleDateString()} has been analyzed and saved successfully.`,
      'report'
    ).catch((e) => console.error('[FCM] report upload notify error:', e.message));

    return res.status(200).json({
      success: true,
      report: report,
      testResults: testResults
    });

  } catch (error) {
    console.error('❌ Error in confirmAndSave:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * POST /api/extraction/manual-save
 * 
 * Manually save report with user-entered data
 * 
 * Request Body:
 * {
 *   reportName: string (required)
 *   homeCategory: string (required)
 *   reportDate: string (required) - ISO date string
 *   parameters: array (required) - User-entered parameters
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   report: { id, ... },
 *   testResults: [...]
 * }
 */
async function manualSave(req, res) {
  try {
    const { reportName, homeCategory, reportDate, parameters } = req.body;
    const userId = req.user.id; // From authenticate middleware

    // Validate required fields
    if (!reportName || !homeCategory || !reportDate || !parameters) {
      return res.status(400).json({
        success: false,
        message: 'reportName, homeCategory, reportDate, and parameters are required'
      });
    }

    if (!Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'parameters must be a non-empty array'
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✍️  EXTRACTION API - Manual Save');
    console.log('='.repeat(70));
    console.log(`👤 User ID: ${userId}`);
    console.log(`📋 Report Name: ${reportName}`);
    console.log(`🏠 Home Category: ${homeCategory}`);
    console.log(`📅 Report Date: ${reportDate}`);
    console.log(`🧪 Parameters: ${parameters.length}`);

    // Auto-populate master tables for manually entered data
    const masterData = await autoPopulateMasterTables(
      { 
        testName: reportName, 
        category: 'Lab Reports', 
        subcategory: homeCategory 
      },
      '', // No OCR text for manual entry
      parameters
    );

    // Create report with link to lab center (if any)
    const report = await prisma.report.create({
      data: {
        userId: userId,
        centerId: masterData.labCenterId,
        testType: reportName,
        reportDate: new Date(reportDate),
        category: 'Lab Reports',
        subcategory: homeCategory,
        fileName: `${reportName}_${new Date(reportDate).toISOString().split('T')[0]}.pdf`,
      }
    });

    console.log(`✅ Report created: ${report.id}`);

    // Save test results with master table links
    const testResults = [];
    
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      
      // Skip empty parameters
      if (!param.value || param.value === '') {
        continue;
      }

      // Get corresponding master data IDs
      const processedParam = masterData.processedParams[i];

      // Determine status using universal status evaluator
      const status = determineStatus(param);

      const testResult = await prisma.testResult.create({
        data: {
          reportId: report.id,
          testDefinitionId: processedParam?.testDefinitionId, // Link to test_definitions
          parameterId: processedParam?.testParameterId,      // Link to test_parameters
          testCategory: 'Lab Reports',
          testSubCategory: homeCategory,
          testName: reportName,
          parameterName: param.parameterName || param.parameter,
          value: String(param.value),
          unit: param.unit || '',
          status: status,
          referenceRange: param.referenceRange || '',
          testDate: new Date(reportDate),
        }
      });

      testResults.push(testResult);
    }

    console.log(`✅ Saved ${testResults.length} test results with master table links`);

    // Generate health summary automatically
    console.log('\n📊 Generating health summary...');
    try {
      const healthSummary = await generateHealthSummaryForReport(userId, report.id, testResults);
      console.log(`✅ Health summary created: ${healthSummary.id}`);
    } catch (summaryError) {
      console.log('⚠️  Could not generate health summary (non-critical):', summaryError.message);
    }

    // Send notification to patient that their report was manually saved
    sendNotificationToUser(
      userId,
      'Medical Report Saved',
      `Your ${reportName} report from ${new Date(reportDate).toLocaleDateString()} has been saved successfully.`,
      'report'
    ).catch((e) => console.error('[FCM] manual report save notify error:', e.message));

    return res.status(200).json({
      success: true,
      report: report,
      testResults: testResults
    });

  } catch (error) {
    console.error('❌ Error in manualSave:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Helper function: Map report type to home category
 */
function mapReportTypeToCategory(reportType) {
  const categoryMap = {
    'GLUCOSE': 'Blood Tests',
    'THYROID': 'Thyroid Tests',
    'LIPID': 'Lipid Panel',
    'CBC': 'Blood Tests',
    'LIVER': 'Liver Function',
    'KIDNEY': 'Kidney Function',
    'DIABETES': 'Blood Tests',
    'HEMOGLOBIN': 'Blood Tests',
  };

  return categoryMap[reportType] || 'General Tests';
}

/**
 * Helper function: Map report type to full metadata
 */
function mapReportTypeToMetadata(reportType) {
  const metadataMap = {
    'GLUCOSE': {
      category: 'Lab Reports',
      subcategory: 'Blood Tests',
      testName: 'Blood Glucose Test'
    },
    'THYROID': {
      category: 'Lab Reports',
      subcategory: 'Thyroid Tests',
      testName: 'Thyroid Function Test'
    },
    'LIPID': {
      category: 'Lab Reports',
      subcategory: 'Lipid Panel',
      testName: 'Lipid Profile Test'
    },
    'CBC': {
      category: 'Lab Reports',
      subcategory: 'Blood Tests',
      testName: 'Complete Blood Count'
    },
    'LIVER': {
      category: 'Lab Reports',
      subcategory: 'Liver Function',
      testName: 'Liver Function Test'
    },
    'KIDNEY': {
      category: 'Lab Reports',
      subcategory: 'Kidney Function',
      testName: 'Kidney Function Test'
    },
    'DIABETES': {
      category: 'Lab Reports',
      subcategory: 'Blood Tests',
      testName: 'Diabetes Test'
    },
    'HEMOGLOBIN': {
      category: 'Lab Reports',
      subcategory: 'Blood Tests',
      testName: 'Hemoglobin Test'
    },
  };

  return metadataMap[reportType] || {
    category: 'Lab Reports',
    subcategory: 'General Tests',
    testName: reportType
  };
}

/**
 * Helper function: Determine test result status using universal status evaluator
 */
function determineStatus(param) {
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
 * Helper function: Generate health summary for a report
 */
async function generateHealthSummaryForReport(userId, reportId, testResults) {
  // Analyze test results for abnormalities
  const highValues = [];
  const lowValues = [];
  const criticalIssues = [];
  
  for (const result of testResults) {
    const status = result.status.toUpperCase(); // Normalize to uppercase
    
    if (status === 'HIGH') {
      highValues.push({
        parameter: result.parameterName,
        value: result.value,
        unit: result.unit,
        referenceRange: result.referenceRange
      });
      
      // Check for critical high values
      const value = parseFloat(result.value);
      if (
        (result.parameterName.includes('Glucose') && value > 200) ||
        (result.parameterName.includes('Blood sugar') && value > 200) ||
        (result.parameterName.includes('Cholesterol') && value > 240)
      ) {
        criticalIssues.push(result.parameterName);
      }
    } else if (status === 'LOW') {
      lowValues.push({
        parameter: result.parameterName,
        value: result.value,
        unit: result.unit,
        referenceRange: result.referenceRange
      });
    }
  }

  // Generate summary text
  let summaryText = '';
  let insights = '';
  let overallStatus = 'NORMAL';
  let riskLevel = 'LOW';
  let keyIssues = [];
  let recommendations = [];

  const abnormalCount = highValues.length + lowValues.length;

  if (abnormalCount === 0) {
    summaryText = '✅ All test results are within normal ranges.\n\nGreat job maintaining your health!';
    overallStatus = 'NORMAL';
    riskLevel = 'LOW';
  } else {
    summaryText = `Test Report Analysis:\n\n`;
    
    if (highValues.length > 0) {
      summaryText += `🔴 High Values Detected (${highValues.length}):\n`;
      highValues.forEach(item => {
        summaryText += `• ${item.parameter}: ${item.value} ${item.unit} (Normal: ${item.referenceRange})\n`;
        keyIssues.push(`High ${item.parameter}`);
      });
      summaryText += '\n';
    }

    if (lowValues.length > 0) {
      summaryText += `🔵 Low Values Detected (${lowValues.length}):\n`;
      lowValues.forEach(item => {
        summaryText += `• ${item.parameter}: ${item.value} ${item.unit} (Normal: ${item.referenceRange})\n`;
        keyIssues.push(`Low ${item.parameter}`);
      });
      summaryText += '\n';
    }

    // Determine overall status
    if (criticalIssues.length > 0) {
      overallStatus = 'CRITICAL';
      riskLevel = 'HIGH';
      insights = `🚨 Critical Issues:\n${criticalIssues.join(', ')} requires immediate medical attention.\n\n`;
      recommendations.push('Consult your doctor immediately');
      recommendations.push('Follow prescribed treatment plan');
    } else if (highValues.length > 2 || lowValues.length > 2) {
      overallStatus = 'CAUTION';
      riskLevel = 'MEDIUM';
      insights = `⚠️ Multiple parameters outside normal range. Regular monitoring recommended.\n\n`;
      recommendations.push('Schedule a follow-up appointment');
      recommendations.push('Monitor these values regularly');
    } else {
      overallStatus = 'CAUTION';
      riskLevel = 'LOW';
      insights = `📊 Some parameters need attention. Consult your healthcare provider for guidance.\n\n`;
      recommendations.push('Discuss results with your doctor');
      recommendations.push('Follow healthy lifestyle practices');
    }
  }

  // Create health summary
  const healthSummary = await prisma.healthSummary.create({
    data: {
      userId: userId,
      reportId: reportId,
      summaryText: summaryText,
      insights: insights || null,
      overallStatus: overallStatus,
      abnormalCount: abnormalCount,
      riskLevel: riskLevel,
      keyIssues: JSON.stringify(keyIssues),
      recommendations: JSON.stringify(recommendations),
    }
  });

  return healthSummary;
}

module.exports = {
  analyzeReport,
  confirmAndSave,
  manualSave
};
