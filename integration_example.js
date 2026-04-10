/**
 * Real-World Integration Example
 * 
 * Shows how to integrate the Blood Sugar Processor with your existing
 * extraction and normalization pipeline
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');
const { normalizeExtractedData } = require('./services/normalizer');
const {
  processBloodSugarReport,
  getReportSummary,
  getInterpretation,
  exportReport
} = require('./services/bloodSugarProcessor');

// ═══════════════════════════════════════════════════════════════════════════
// Example 1: Complete Pipeline (OCR → Blood Sugar Report)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('🔄 COMPLETE PIPELINE EXAMPLE');
console.log('═'.repeat(80));

// Simulated OCR text from your blood glucose report
const ocrText = `
KKC LAB
Patient: Aurora
Date: 13-07-2020

BIO-CHEMISTRY
Blood sugar (Fasting)     138    mg/dl    70 - 110
Blood sugar (Post Prandial) 254  mg/dl    80 - 140

Blood Pressure ( BP)
Systolic    155    mm of Hg
Diastolic    98    mm of Hg

Pulse        85    per/mint
`;

console.log('\n📄 Step 1: OCR Text Input');
console.log(`Length: ${ocrText.length} characters`);

// Extract parameters
console.log('\n🔍 Step 2: Smart Extraction');
const extracted = smartMedicalExtractor.extract(ocrText);
console.log(`Extracted ${extracted.parameters.length} parameters`);
extracted.parameters.forEach((p, i) => {
  console.log(`   ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
});

// Normalize
console.log('\n✨ Step 3: Normalization');
const normalized = normalizeExtractedData(extracted.parameters);
console.log(`Normalized to ${normalized.length} unique parameters`);

// Process as blood sugar report
console.log('\n🩸 Step 4: Blood Sugar Processing');
const bloodSugarReport = processBloodSugarReport(normalized);
const compact = exportReport(bloodSugarReport, 'compact');
console.log('Blood Sugar Parameters Only:');
console.log(JSON.stringify(compact, null, 2));

// Get summary
console.log('\n📊 Step 5: Summary');
const summary = getReportSummary(bloodSugarReport);
console.log(`Total: ${summary.totalParameters}`);
console.log(`Detected: ${summary.detected}`);
console.log(`Abnormal: ${summary.abnormal}`);
console.log(`Average Confidence: ${summary.averageConfidence}%`);

// Get interpretation
console.log('\n🩺 Step 6: Medical Interpretation');
const interpretation = getInterpretation(bloodSugarReport);
console.log(interpretation);

// ═══════════════════════════════════════════════════════════════════════════
// Example 2: API Endpoint Integration
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n' + '═'.repeat(80));
console.log('🌐 API ENDPOINT INTEGRATION EXAMPLE');
console.log('═'.repeat(80));

async function analyzeBloodSugarReport(req, res) {
  try {
    const { ocrText } = req.body;

    // Extract
    const extracted = smartMedicalExtractor.extract(ocrText);
    
    if (!extracted.success || extracted.parameters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No parameters extracted'
      });
    }

    // Normalize
    const normalized = normalizeExtractedData(extracted.parameters);

    // Process as blood sugar
    const bloodSugarReport = processBloodSugarReport(normalized);
    const summary = getReportSummary(bloodSugarReport);
    const interpretation = getInterpretation(bloodSugarReport);

    // Check if any blood sugar parameters were found
    if (summary.detected === 0) {
      return res.status(400).json({
        success: false,
        message: 'No blood sugar parameters found in report'
      });
    }

    return res.status(200).json({
      success: true,
      reportType: 'BLOOD_SUGAR',
      parameters: bloodSugarReport,
      summary: {
        detected: summary.detected,
        abnormal: summary.abnormal,
        averageConfidence: summary.averageConfidence
      },
      interpretation: interpretation,
      requiresAttention: summary.abnormal > 0
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

console.log('\nAPI Endpoint Pattern:');
console.log('POST /api/blood-sugar/analyze');
console.log('Request: { ocrText: "..." }');
console.log('\nResponse:');
console.log(`{
  success: true,
  reportType: 'BLOOD_SUGAR',
  parameters: { fasting_glucose: {...}, ... },
  summary: { detected: 2, abnormal: 2, ... },
  interpretation: "...",
  requiresAttention: true
}`);

// ═══════════════════════════════════════════════════════════════════════════
// Example 3: Database Saving Pattern
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n' + '═'.repeat(80));
console.log('💾 DATABASE SAVING PATTERN');
console.log('═'.repeat(80));

async function saveBloodSugarReport(userId, ocrText, reportDate) {
  // Extract and process
  const extracted = smartMedicalExtractor.extract(ocrText);
  const normalized = normalizeExtractedData(extracted.parameters);
  const bloodSugarReport = processBloodSugarReport(normalized);
  const summary = getReportSummary(bloodSugarReport);
  const interpretation = getInterpretation(bloodSugarReport);

  // Determine overall status
  let overallStatus = 'NORMAL';
  if (summary.abnormal > summary.detected / 2) {
    overallStatus = 'CRITICAL';
  } else if (summary.abnormal > 0) {
    overallStatus = 'CAUTION';
  }

  /*
  // Save to database
  const report = await prisma.report.create({
    data: {
      userId,
      testType: 'Blood Sugar',
      reportDate: new Date(reportDate),
      category: 'Blood Tests',
      subcategory: 'Glucose',
      ocrText
    }
  });

  // Save each blood sugar parameter
  for (const [key, param] of Object.entries(bloodSugarReport)) {
    if (param.value !== null) {
      await prisma.testResult.create({
        data: {
          reportId: report.id,
          parameterName: param.name,
          value: String(param.value),
          unit: param.unit,
          status: param.status === 'High' ? 'HIGH' : 
                  param.status === 'Low' ? 'LOW' : 'NORMAL',
          testDate: new Date(reportDate)
        }
      });
    }
  }

  // Save health summary
  await prisma.healthSummary.create({
    data: {
      userId,
      reportId: report.id,
      overallStatus,
      abnormalCount: summary.abnormal,
      riskLevel: summary.abnormal > 2 ? 'HIGH' : 'MEDIUM',
      summaryText: interpretation
    }
  });

  return report;
  */

  console.log('\nDatabase Save Pattern:');
  console.log('1. Process blood sugar report');
  console.log('2. Create Report record');
  console.log('3. Create TestResult for each detected parameter');
  console.log('4. Create HealthSummary with interpretation');
  console.log(`\nWould save ${summary.detected} parameters with status: ${overallStatus}`);
}

// Simulate save
saveBloodSugarReport('user-123', ocrText, '2026-02-17');

// ═══════════════════════════════════════════════════════════════════════════
// Example 4: Multi-Report Comparison
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n' + '═'.repeat(80));
console.log('📈 MULTI-REPORT COMPARISON');
console.log('═'.repeat(80));

// Report 1 (older)
const report1Data = [
  { parameter: 'Fasting Glucose', value: 105, unit: 'mg/dl' },
  { parameter: 'HbA1c', value: 5.8, unit: '%' }
];

// Report 2 (newer)
const report2Data = [
  { parameter: 'Fasting Glucose', value: 138, unit: 'mg/dl' },
  { parameter: 'HbA1c', value: 6.8, unit: '%' }
];

const report1 = processBloodSugarReport(report1Data);
const report2 = processBloodSugarReport(report2Data);

console.log('\n📅 Report 1 (Older):');
console.log(`   Fasting: ${report1.fasting_glucose.value} mg/dL [${report1.fasting_glucose.status}]`);
console.log(`   HbA1c: ${report1.hba1c.value}% [${report1.hba1c.status}]`);

console.log('\n📅 Report 2 (Newer):');
console.log(`   Fasting: ${report2.fasting_glucose.value} mg/dL [${report2.fasting_glucose.status}]`);
console.log(`   HbA1c: ${report2.hba1c.value}% [${report2.hba1c.status}]`);

console.log('\n📊 Trend Analysis:');
const fastingChange = report2.fasting_glucose.value - report1.fasting_glucose.value;
const hba1cChange = report2.hba1c.value - report1.hba1c.value;

console.log(`   Fasting Glucose: ${fastingChange > 0 ? '📈' : '📉'} ${Math.abs(fastingChange)} mg/dL`);
console.log(`   HbA1c: ${hba1cChange > 0 ? '📈' : '📉'} ${Math.abs(hba1cChange)}%`);

if (fastingChange > 0 || hba1cChange > 0) {
  console.log('\n⚠️ Blood sugar levels are increasing. Consider medical consultation.');
}

// ═══════════════════════════════════════════════════════════════════════════
// Example 5: Report Type Detection
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n' + '═'.repeat(80));
console.log('🔍 REPORT TYPE AUTO-DETECTION');
console.log('═'.repeat(80));

function detectReportType(extractedData) {
  // Try blood sugar
  const bloodSugar = processBloodSugarReport(extractedData);
  const bloodSugarSummary = getReportSummary(bloodSugar);

  if (bloodSugarSummary.detected >= 2) {
    return {
      type: 'BLOOD_SUGAR',
      report: bloodSugar,
      summary: bloodSugarSummary,
      confidence: bloodSugarSummary.averageConfidence
    };
  }

  // Future: Try lipid profile
  // Future: Try CBC
  // Future: Try kidney function

  return {
    type: 'UNKNOWN',
    report: null,
    summary: null,
    confidence: 0
  };
}

const mixedData = [
  { parameter: 'Fasting Glucose', value: 95, unit: 'mg/dl' },
  { parameter: 'HbA1c', value: 5.4, unit: '%' }
];

const detected = detectReportType(mixedData);
console.log(`\nDetected Report Type: ${detected.type}`);
console.log(`Confidence: ${detected.confidence}%`);
console.log(`Detected Parameters: ${detected.summary.detected}`);

console.log('\n\n' + '═'.repeat(80));
console.log('✅ ALL INTEGRATION EXAMPLES COMPLETE');
console.log('═'.repeat(80));
console.log('\n📝 Summary of Use Cases:');
console.log('   1. Complete OCR → Blood Sugar pipeline');
console.log('   2. API endpoint integration');
console.log('   3. Database saving pattern');
console.log('   4. Multi-report comparison & trends');
console.log('   5. Automatic report type detection');
console.log('\n🚀 Production Ready!\n');
