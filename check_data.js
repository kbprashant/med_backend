const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking Test Results ===\n');
    
    const results = await prisma.testResult.findMany({
      select: {
        testName: true,
        parameterName: true,
        testDate: true,
        value: true,
        reportId: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found', results.length, 'test results:');
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n=== Checking Reports ===\n');
    
    const reports = await prisma.report.findMany({
      select: {
        id: true,
        testType: true,
        reportDate: true,
        _count: {
          select: { testResults: true }
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found', reports.length, 'reports:');
    console.log(JSON.stringify(reports, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
