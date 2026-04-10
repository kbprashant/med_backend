const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportId = 'fd35a09b-da14-45eb-85c2-5e239124b51a';
    
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        testResults: {
          orderBy: { testName: 'asc' }
        }
      }
    });

    if (!report) {
      console.log('❌ Report not found');
      return;
    }

    console.log('📋 Report Details:');
    console.log(`   ID: ${report.id}`);
    console.log(`   Type: ${report.testType}`);
    console.log(`   Date: ${report.reportDate.toISOString().split('T')[0]}`);
    console.log(`   Status: ${report.status}`);
    console.log(`   File: ${report.filePath || 'N/A'}`);
    console.log(`   OCR Text Length: ${report.ocrText?.length || 0}`);
    console.log(`   Test Results: ${report.testResults.length}`);

    if (report.testResults.length > 0) {
      console.log('\n📊 Test Results:');
      report.testResults.forEach((tr, i) => {
        console.log(`   ${i + 1}. ${tr.parameterName || tr.testName}`);
        console.log(`      Test Name: ${tr.testName}`);
        console.log(`      Value: ${tr.value} ${tr.unit || ''}`);
        console.log(`      Reference: ${tr.referenceRange || 'N/A'}`);
        console.log(`      Status: ${tr.status || 'Normal'}`);
        console.log(`      Category: ${tr.testCategory || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No test results found for this report');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
