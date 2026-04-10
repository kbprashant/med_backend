const prisma = require('./config/database');

async function findAllReports() {
  try {
    // Find all reports with their test results
    const reports = await prisma.report.findMany({
      include: { 
        testResults: true,
        user: { select: { phoneNumber: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`\n📊 Found ${reports.length} recent reports:\n`);

    reports.forEach((report, idx) => {
      console.log(`${idx + 1}. Report ID: ${report.id}`);
      console.log(`   Type: ${report.testType}`);
      console.log(`   Date: ${report.reportDate}`);
      console.log(`   User: ${report.user?.phoneNumber || 'Unknown'}`);
      console.log(`   Test Results (${report.testResults.length}):`);
      report.testResults.forEach(t => {
        console.log(`      - ${t.parameterName}: ${t.value} ${t.unit}`);
      });
      console.log('');
    });

    // Show which report to delete
    const dateToday = new Date('2026-02-13');
    const reportsToday = reports.filter(r => {
      const reportDate = new Date(r.reportDate);
      return reportDate.toDateString() === dateToday.toDateString();
    });

    if (reportsToday.length > 0) {
      console.log('\n🎯 Reports from today (Feb 13, 2026):');
      reportsToday.forEach(r => {
        console.log(`   - ID: ${r.id} (${r.testType})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllReports();
