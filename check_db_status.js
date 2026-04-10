const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportCount = await prisma.report.count();
    const testResultCount = await prisma.testResult.count();
    const userCount = await prisma.user.count();

    console.log('📊 Database Status:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Reports: ${reportCount}`);
    console.log(`   Test Results: ${testResultCount}`);

    if (reportCount > 0) {
      console.log('\n📋 Recent Reports:');
      const reports = await prisma.report.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { testResults: true } } },
      });

      reports.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.testType} - ${r._count.testResults} test results`);
        console.log(`      Date: ${r.reportDate.toISOString().split('T')[0]}`);
        console.log(`      ID: ${r.id}`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
