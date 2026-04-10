const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const summaries = await prisma.healthSummary.findMany({
      select: {
        reportId: true,
        overallStatus: true,
        abnormalCount: true,
        riskLevel: true,
        summaryText: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n=== Found ${summaries.length} Health Summaries ===\n`);
    summaries.forEach((s, i) => {
      console.log(`${i + 1}. Status: ${s.overallStatus} | Risk: ${s.riskLevel} | Abnormal: ${s.abnormalCount}`);
      console.log(`   Summary: ${s.summaryText.split('\n')[0]}`);
      console.log(`   Created: ${s.createdAt.toLocaleString()}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
