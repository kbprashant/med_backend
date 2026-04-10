const { PrismaClient } = require('@prisma/client');
const extractor = require('./services/smartMedicalExtractor');

const prisma = new PrismaClient();

async function reExtractLipidAndThyroidReports() {
  try {
    console.log('\n🔄 RE-EXTRACTING LIPID AND THYROID REPORTS...\n');
    
    // Find all lipid and thyroid reports
    const reports = await prisma.report.findMany({
      where: {
        OR: [
          { testType: { contains: 'Lipid', mode: 'insensitive' } },
          { testType: { contains: 'Thyroid', mode: 'insensitive' } }
        ]
      },
      include: {
        testResults: true
      }
    });
    
    if (reports.length === 0) {
      console.log('❌ No lipid or thyroid reports found');
      return;
    }
    
    console.log(`📋 Found ${reports.length} reports to re-extract\n`);
    
    let totalBefore = 0;
    let totalAfter = 0;
    
    for (const report of reports) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Processing: ${report.testType}`);
      console.log(`   Report ID: ${report.id}`);
      console.log(`   Date: ${report.testDate}`);
      console.log(`   Current parameters: ${report.testResults.length}`);
      
      totalBefore += report.testResults.length;
      
      // Re-extract parameters
      const extracted = await extractor.extract(report.ocrText);
      
      console.log(`\n✅ Extracted ${extracted.parameters.length} parameters (raw)`);
      
      // Delete old test results
      if (report.testResults.length > 0) {
        const deleted = await prisma.testResult.deleteMany({
          where: { reportId: report.id }
        });
        console.log(`🗑️  Deleting old test results... Deleted ${deleted.count} old results`);
      }
      
      // Save new test results
      if (extracted.parameters.length > 0) {
        console.log('💾 Saving new test results...');
        
        // Determine test category from report type
        let testCategory = 'OTHER';
        const testTypeLower = report.testType.toLowerCase();
        if (testTypeLower.includes('lipid') || testTypeLower.includes('cholesterol')) {
          testCategory = 'LIPID';
        } else if (testTypeLower.includes('thyroid')) {
          testCategory = 'THYROID';
        } else if (testTypeLower.includes('liver') || testTypeLower.includes('lft')) {
          testCategory = 'LIVER';
        } else if (testTypeLower.includes('kidney') || testTypeLower.includes('kft') || testTypeLower.includes('renal')) {
          testCategory = 'KIDNEY';
        } else if (testTypeLower.includes('cbc') || testTypeLower.includes('blood count')) {
          testCategory = 'BLOOD';
        }
        
        for (const param of extracted.parameters) {
          await prisma.testResult.create({
            data: {
              reportId: report.id,
              testCategory: testCategory,
              testSubCategory: '',
              testName: report.testType,
              parameterName: param.parameter,
              value: String(param.value),
              unit: param.unit || '',
              status: param.status || 'NORMAL',
              testDate: report.testDate || new Date()
            }
          });
          
          console.log(`   ✅ ${param.parameter}: ${param.value}${param.unit ? ' ' + param.unit : ''}`);
        }
        
        totalAfter += extracted.parameters.length;
        
        console.log(`\n✅ Re-extracted: ${report.testType}`);
        console.log(`   Before: ${report.testResults.length} parameters`);
        console.log(`   After: ${extracted.parameters.length} parameters`);
        console.log(`   Change: ${extracted.parameters.length - report.testResults.length >= 0 ? '+' : ''}${extracted.parameters.length - report.testResults.length} parameters`);
      } else {
        console.log('⚠️  No parameters extracted from this report');
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ ALL LIPID AND THYROID REPORTS RE-EXTRACTED');
    console.log(`   Total Reports: ${reports.length}`);
    console.log(`   Before: ${totalBefore} total parameters`);
    console.log(`   After: ${totalAfter} total parameters`);
    console.log(`   Improvement: ${totalAfter - totalBefore >= 0 ? '+' : ''}${totalAfter - totalBefore} parameters`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reExtractLipidAndThyroidReports();
