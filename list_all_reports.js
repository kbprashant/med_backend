const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { testResults: true } }
      }
    });

    console.log(`📊 Total Reports: ${reports.length}\n`);

    reports.forEach((r, i) => {
      console.log(`${i + 1}. Report ID: ${r.id}`);
      console.log(`   Type: ${r.testType}`);
      console.log(`   Date: ${r.reportDate.toISOString().split('T')[0]}`);
      console.log(`   Created: ${r.createdAt.toISOString()}`);
      console.log(`   Test Results: ${r._count.testResults}`);
      console.log(`   OCR Text: ${r.ocrText ? `${r.ocrText.length} chars` : 'None'}`);
      console.log(`   File: ${r.filePath || 'N/A'}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
