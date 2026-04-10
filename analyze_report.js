const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Detailed Report Analysis\n');
    
    const report = await prisma.report.findFirst({
      include: { testResults: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      console.log('No reports found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Report ID: ${report.id}`);
    console.log(`Test Type: ${report.testType}`);
    console.log(`\nTest Results (${report.testResults.length}):`);
    
    if (report.testResults.length > 0) {
      report.testResults.forEach((tr, i) => {
        console.log(`\n${i + 1}. Parameter: "${tr.parameterName}"`);
        console.log(`   Test Name: "${tr.testName}"`);
        console.log(`   Test Category: "${tr.testCategory}"`);
        console.log(`   Test SubCategory: "${tr.testSubCategory}"`);
        console.log(`   Value: ${tr.value} ${tr.unit || 'N/A'}`);
        console.log(`   Status: ${tr.status}`);
      });
    }
    
    console.log(`\n📝 OCR Text (first 800 chars):\n`);
    console.log('---START---');
    console.log(report.ocrText?.substring(0, 800) || 'No OCR text');
    console.log('---END---');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
