const prisma = require('./config/database');
const smartExtractor = require('./services/smartMedicalExtractor');

async function reExtractKFT() {
  try {
    console.log('🔄 Re-extracting KFT report with updated extractor...\n');
    
    // Find KFT report (most recent)
    const kftReport = await prisma.report.findFirst({
      where: { 
        OR: [
          { testType: { contains: 'KFT' } },
          { testType: { contains: 'Kidney Function' } }
        ]
      },
      include: { testResults: true },
      orderBy: { reportDate: 'desc' }
    });
    
    if (!kftReport) {
      console.log('❌ No KFT report found');
      return;
    }
    
    console.log(`📋 Found KFT Report: ${kftReport.testType}`);
    console.log(`   ID: ${kftReport.id}`);
    console.log(`   Current parameters: ${kftReport.testResults.length}`);
    console.log(`   Has OCR text: ${kftReport.ocrText ? 'Yes' : 'No'}\n`);
    
    if (!kftReport.ocrText) {
      console.log('❌ No OCR text available');
      return;
    }

    console.log('🔬 Running smart extraction...\n');
    const extractionResult = smartExtractor.extract(kftReport.ocrText);

    console.log(`\n✅ Extracted ${extractionResult.parameters.length} parameters (raw)`);
    
    // Delete old test results
    console.log('\n🗑️  Deleting old test results...');
    await prisma.testResult.deleteMany({
      where: { reportId: kftReport.id }
    });
    console.log(`   Deleted ${kftReport.testResults.length} old results`);

    // Save new parameters
    console.log('\n💾 Saving new test results...\n');
    for (const param of extractionResult.parameters) {
      const result = await prisma.testResult.create({
        data: {
          reportId: kftReport.id,
          testCategory: kftReport.category,
          testSubCategory: kftReport.subcategory,
          testName: kftReport.testType,
          parameterName: param.parameter,
          value: String(param.value), // Convert to string
          unit: param.unit || '',
          status: 'NORMAL', // Will be updated by status determination logic
          testDate: kftReport.reportDate
        }
      });
      console.log(`✅ ${param.parameter}: ${param.value} ${param.unit || ''}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Re-extracted KFT report');
    console.log(`   Before: ${kftReport.testResults.length} parameters`);
    console.log(`   After: ${extractionResult.parameters.length} parameters`);
    console.log(`   Improvement: ${extractionResult.parameters.length > kftReport.testResults.length ? '+' : ''}${extractionResult.parameters.length - kftReport.testResults.length} parameters`);
    console.log('='.repeat(80));
    console.log('\n💡 Now refresh your app to see the corrected KFT parameters!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

reExtractKFT();
