const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking latest report with test results...\n');
    
    const reports = await prisma.report.findMany({
      include: { testResults: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (reports.length === 0) {
      console.log('No reports found');
    } else {
      const report = reports[0];
      console.log(`Report ID: ${report.id}`);
      console.log(`Test Type: ${report.testType}`);
      console.log(`Report Date: ${report.reportDate}`);
      console.log(`Test Results Count: ${report.testResults.length}\n`);
      
      if (report.testResults.length > 0) {
        console.log('Test Results:');
        report.testResults.forEach((tr, index) => {
          console.log(`  ${index + 1}. ${tr.parameterName}: ${tr.value} ${tr.unit || ''} [${tr.status}]`);
        });
      } else {
        console.log('⚠️ No test results stored!');
        console.log('\nOCR Text Preview:');
        console.log(report.ocrText?.substring(0, 300));
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
