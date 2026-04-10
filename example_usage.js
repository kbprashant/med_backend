/**
 * Example: How to use the Normalization Layer in Production
 * 
 * This demonstrates the complete pipeline from OCR extraction
 * to database insertion with normalization
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');
const { normalizeExtractedData } = require('./services/normalizer');

/**
 * EXAMPLE 1: Basic Usage
 * Extract → Normalize → Save
 */
async function basicNormalizationExample() {
  console.log('\n📋 EXAMPLE 1: Basic Normalization Pipeline');
  console.log('='.repeat(70));

  // Step 1: OCR text (simulated)
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
  console.log(`   Length: ${ocrText.length} characters`);

  // Step 2: Smart extraction
  const extractionResult = smartMedicalExtractor.extract(ocrText);
  
  console.log('\n🔍 Step 2: Smart Extraction');
  console.log(`   Found: ${extractionResult.parameters.length} parameters`);
  extractionResult.parameters.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
  });

  // Step 3: Normalization
  const normalized = normalizeExtractedData(extractionResult.parameters);
  
  console.log('\n✨ Step 3: Normalization & Deduplication');
  console.log(`   Unique: ${normalized.length} parameters`);
  normalized.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.parameter}: ${p.value} ${p.unit}`);
  });

  // Step 4: Ready for database
  console.log('\n💾 Step 4: Database-Ready Format');
  console.log(JSON.stringify(normalized, null, 2));

  return normalized;
}

/**
 * EXAMPLE 2: Multi-Report Deduplication
 * Handle multiple reports from different labs for the same patient
 */
function multiReportExample() {
  console.log('\n\n📊 EXAMPLE 2: Multi-Report Deduplication');
  console.log('='.repeat(70));

  // Simulate extraction from 2 different lab formats
  const report1 = [
    { parameter: 'Blood sugar Fasting', value: 138, unit: 'mg/dl' },
    { parameter: 'Blood Pressure Systolic', value: 155, unit: 'mmofhg' }
  ];

  const report2 = [
    { parameter: 'Glucose Fasting Plasma', value: 124, unit: 'mg/dL' },
    { parameter: 'Systolic', value: 150, unit: 'mm Hg' }
  ];

  console.log('\n📥 Report 1 (KKC Lab):');
  report1.forEach(p => console.log(`   ${p.parameter}: ${p.value} ${p.unit}`));

  console.log('\n📥 Report 2 (Hyderabad Diagnostics):');
  report2.forEach(p => console.log(`   ${p.parameter}: ${p.value} ${p.unit}`));

  // Combine and normalize
  const combined = [...report1, ...report2];
  const normalized = normalizeExtractedData(combined);

  console.log('\n✨ After Normalization (Last value wins):');
  normalized.forEach(p => console.log(`   ${p.parameter}: ${p.value} ${p.unit}`));

  console.log('\n✅ Result: Duplicates merged by standard name');
}

/**
 * EXAMPLE 3: Production Database Save Pattern
 */
async function productionSavePattern(userId, ocrText, reportDate) {
  console.log('\n\n🏭 EXAMPLE 3: Production Save Pattern');
  console.log('='.repeat(70));

  try {
    // Step 1: Extract from OCR
    const extractionResult = smartMedicalExtractor.extract(ocrText);
    
    if (!extractionResult.success || extractionResult.parameters.length === 0) {
      console.log('❌ No parameters extracted - require manual entry');
      return { success: false, requiresManualEntry: true };
    }

    console.log(`\n✅ Extracted ${extractionResult.parameters.length} raw parameters`);

    // Step 2: Normalize and deduplicate
    const normalizedParams = normalizeExtractedData(extractionResult.parameters);
    
    console.log(`✨ Normalized to ${normalizedParams.length} unique parameters`);

    // Step 3: Save to database (pseudocode)
    /*
    const report = await prisma.report.create({
      data: {
        userId: userId,
        testType: 'Blood Glucose Test',
        reportDate: new Date(reportDate),
        ocrText: ocrText
      }
    });

    for (const param of normalizedParams) {
      await prisma.testResult.create({
        data: {
          reportId: report.id,
          parameterName: param.parameter,  // ← Standardized name
          value: String(param.value),
          unit: param.unit,                 // ← Standardized unit
          status: param.status || 'NORMAL',
          testDate: new Date(reportDate)
        }
      });
    }
    */

    console.log('\n💾 Database Save Pattern:');
    console.log('   1. Create Report record with OCR text');
    console.log('   2. Loop through normalized parameters');
    console.log('   3. Save each as TestResult with standard names/units');
    console.log('   4. Generate Health Summary');

    return {
      success: true,
      report: { id: 'report-123' },
      testResults: normalizedParams
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * EXAMPLE 4: API Controller Integration
 */
function apiControllerExample() {
  console.log('\n\n🌐 EXAMPLE 4: API Controller Integration');
  console.log('='.repeat(70));

  console.log(`
const { normalizeExtractedData } = require('../services/normalizer');

// In analyzeReport endpoint:
async function analyzeReport(req, res) {
  const { ocrText } = req.body;
  
  // Extract
  const result = smartMedicalExtractor.extract(ocrText);
  
  // ✨ Apply normalization
  if (result.success && result.parameters.length > 0) {
    console.log(\`Raw: \${result.parameters.length} parameters\`);
    result.parameters = normalizeExtractedData(result.parameters);
    console.log(\`Normalized: \${result.parameters.length} unique\`);
  }
  
  return res.json({
    success: true,
    parameters: result.parameters  // ← Already normalized
  });
}

// In confirmAndSave endpoint:
async function confirmAndSave(req, res) {
  const { parameters } = req.body;
  
  // ✨ Re-normalize before save (in case client modified)
  const normalized = normalizeExtractedData(parameters);
  
  // Save to database
  for (const param of normalized) {
    await prisma.testResult.create({
      data: {
        parameterName: param.parameter,  // Standardized
        value: param.value,
        unit: param.unit                  // Standardized
      }
    });
  }
}
  `);
}

/**
 * EXAMPLE 5: Benefits Summary
 */
function benefitsSummary() {
  console.log('\n\n📈 BENEFITS OF NORMALIZATION LAYER');
  console.log('='.repeat(70));

  console.log(`
✅ STANDARDIZATION
   • "Blood sugar Fasting" → "Fasting Glucose"
   • "Glucose Fasting Plasma" → "Fasting Glucose"
   • Different labs → Same database field

✅ UNIT CONSISTENCY
   • "mmofhg" → "mm Hg"
   • "mg/dl" → "mg/dL"
   • "permin" → "per/min"

✅ DUPLICATE PREVENTION
   • Multiple extractions of same parameter → Single entry
   • Last occurrence wins (most recent data)
   • Reduces database clutter

✅ SEARCH & ANALYTICS
   • Query: "Fasting Glucose" finds ALL fasting glucose tests
   • Regardless of original lab wording
   • Trend analysis works across different lab formats

✅ MAINTAINABILITY
   • Add new mappings without touching database
   • Centralized normalization rules
   • Easy to extend for new parameters

✅ PRODUCTION READY
   • Handles unknown parameters gracefully
   • Preserves original data when unsure
   • Extensible regex-based patterns
  `);
}

// Run all examples
async function runExamples() {
  console.log('\n' + '═'.repeat(70));
  console.log('📚 NORMALIZATION LAYER - PRODUCTION USAGE EXAMPLES');
  console.log('═'.repeat(70));

  await basicNormalizationExample();
  multiReportExample();
  
  // Example OCR text for production pattern
  const exampleOCR = 'Blood sugar Fasting: 138 mg/dl';
  await productionSavePattern('user-123', exampleOCR, '2026-02-17');
  
  apiControllerExample();
  benefitsSummary();

  console.log('\n' + '═'.repeat(70));
  console.log('✅ DOCUMENTATION COMPLETE');
  console.log('═'.repeat(70));
  console.log('\nFiles created:');
  console.log('   • services/normalizer.js - Core normalization functions');
  console.log('   • test_normalizer.js - Test suite');
  console.log('   • example_usage.js - This file\n');
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  basicNormalizationExample,
  multiReportExample,
  productionSavePattern
};
