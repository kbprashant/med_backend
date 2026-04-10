const prisma = require('./config/database');

async function deleteOldGlucoseReport() {
  try {
    // Find the latest glucose report
    const reports = await prisma.report.findMany({
      where: { testType: 'glucose' },
      include: { testResults: true },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (reports.length === 0) {
      console.log('❌ No glucose reports found');
      return;
    }

    const report = reports[0];
    console.log('\n📄 Found glucose report:');
    console.log('   ID:', report.id);
    console.log('   Date:', report.reportDate);
    console.log('   Test Results:');
    report.testResults.forEach(t => {
      console.log(`      - ${t.parameterName}: ${t.value} ${t.unit}`);
    });

    // Delete test results first
    await prisma.testResult.deleteMany({
      where: { reportId: report.id }
    });
    console.log(`\n✅ Deleted ${report.testResults.length} test results`);

    // Delete the report
    await prisma.report.delete({
      where: { id: report.id }
    });
    console.log('✅ Deleted glucose report');

    console.log('\n🎯 Now upload the same report again through your app');
    console.log('   The NEW PARSER will extract it correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldGlucoseReport();
