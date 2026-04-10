const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportId = process.argv[2];
    
    if (!reportId) {
      // Get latest report if no ID provided
      const latestReport = await prisma.report.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      
      if (!latestReport) {
        console.log('❌ No reports found');
        return;
      }
      
      console.log(`📋 Latest Report (${latestReport.id})`);
      console.log(`Test Type: ${latestReport.testType}`);
      console.log('===================\n');
      console.log(latestReport.ocrText || 'No OCR text');
      console.log('\n===================');
      console.log(`Length: ${latestReport.ocrText?.length || 0} characters`);
      await prisma.$disconnect();
      return;
    }
    
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      console.log('❌ Report not found');
      return;
    }

    console.log('📋 Report OCR Text:');
    console.log('===================\n');
    console.log(report.ocrText || 'No OCR text');
    console.log('\n===================');
    console.log(`Length: ${report.ocrText?.length || 0} characters`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
