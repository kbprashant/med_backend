const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking Health Summaries ===\n');
    
    const summaries = await prisma.healthSummary.findMany({
      select: {
        id: true,
        reportId: true,
        overallStatus: true,
        abnormalCount: true,
        riskLevel: true,
        summaryText: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${summaries.length} health summaries:`);
    console.log(JSON.stringify(summaries, null, 2));
    
    console.log('\n=== Checking Reports ===\n');
    
    const reports = await prisma.report.findMany({
      select: {
        id: true,
        testType: true,
        reportDate: true,
        _count: {
          select: { 
            testResults: true,
            healthSummary: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${reports.length} reports:`);
    reports.forEach(r => {
      console.log(`- ${r.testType} (${r.reportDate.toLocaleDateString()}): ${r._count.testResults} test results, ${r._count.healthSummary} health summary`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
