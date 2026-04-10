const prisma = require('./config/database');
const smartExtractor = require('./services/smartMedicalExtractor');
const { normalizeExtractedData } = require('./services/normalizer');
const { determineStatus } = require('./services/referenceRanges');

async function reExtractCBC() {
  try {
    console.log('🔄 Re-extracting CBC report with updated extractor...\n');
    
    // Find CBC report
    const allReports = await prisma.report.findMany({
      include: { testResults: true },
      orderBy: { reportDate: 'desc' }
    });
    
    const cbcReport = allReports.find(r => 
      r.testType.toLowerCase().includes('blood count') || 
      r.testType.toLowerCase().includes('cbc')
    );
    
    if (!cbcReport) {
      console.log('❌ No CBC report found');
      return;
    }
    
    console.log(`📋 Found CBC Report: ${cbcReport.testType}`);
    console.log(`   ID: ${cbcReport.id}`);
    console.log(`   Current parameters: ${cbcReport.testResults.length}`);
    console.log(`   Has OCR text: ${cbcReport.ocrText ? 'Yes' : 'No'}\n`);
    
    if (!cbcReport.ocrText) {
      console.log('❌ No OCR text available in report. Cannot re-extract.');
      console.log('💡 Please re-upload the CBC report image to extract all parameters.');
      return;
    }
    
    // Extract parameters
    console.log('🔬 Running smart extraction...\n');
    const extractionResult = smartExtractor.extract(cbcReport.ocrText);
    
    if (!extractionResult.success || extractionResult.parameters.length === 0) {
      console.log('❌ Extraction failed:', extractionResult.message);
      return;
    }
    
    console.log(`\n✅ Extracted ${extractionResult.parameters.length} parameters (raw)`);
    
    // Normalize
    const normalizedParams = normalizeExtractedData(extractionResult.parameters);
    console.log(`✅ After normalization: ${normalizedParams.length} unique parameters\n`);
    
    // Delete old test results
    console.log('🗑️  Deleting old test results...');
    await prisma.testResult.deleteMany({
      where: { reportId: cbcReport.id }
    });
    console.log(`   Deleted ${cbcReport.testResults.length} old results\n`);
    
    // Save new test results
    console.log('💾 Saving new test results...\n');
    const newResults = [];
    
    for (const param of normalizedParams) {
      const status = determineStatus(param.parameter, param.value, param.unit);
      
      const testResult = await prisma.testResult.create({
        data: {
          reportId: cbcReport.id,
          testName: cbcReport.testType,
          testCategory: cbcReport.category,
          testSubCategory: cbcReport.subcategory,
          parameterName: param.parameter,
          value: param.value.toString(),
          unit: param.unit || '',
          status: status || 'NORMAL',
          testDate: cbcReport.reportDate
        }
      });
      
      const statusEmoji = status === 'HIGH' ? '🔴' : status === 'LOW' ? '🔵' : '✅';
      console.log(`   ${statusEmoji} ${param.parameter}: ${param.value} ${param.unit} [${status || 'NORMAL'}]`);
      newResults.push(testResult);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ SUCCESS! Re-extracted CBC report`);
    console.log(`   Before: ${cbcReport.testResults.length} parameters`);
    console.log(`   After: ${newResults.length} parameters`);
    console.log(`   Improvement: +${newResults.length - cbcReport.testResults.length} parameters`);
    console.log('='.repeat(80));
    
    console.log('\n💡 Now refresh your app to see all CBC parameters!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reExtractCBC();
