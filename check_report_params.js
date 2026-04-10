/**
 * Check test results for a specific report
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReportParams() {
  try {
    console.log('🔍 Checking all LFT reports and their parameters...\n');

    // Get all LFT reports
    const reports = await prisma.report.findMany({
      where: {
        testType: 'LFT'
      },
      orderBy: {
        reportDate: 'desc'
      },
      take: 5
    });

    console.log(`📊 Found ${reports.length} LFT reports\n`);

    for (const report of reports) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📄 Report ID: ${report.id}`);
      console.log(`📅 Date: ${report.reportDate.toISOString()}`);
      console.log(`${'='.repeat(70)}`);

      // Get all test results for this report
      const testResults = await prisma.testResult.findMany({
        where: {
          reportId: report.id
        },
        orderBy: {
          parameterName: 'asc'
        }
      });

      console.log(`\n✅ Found ${testResults.length} parameters:\n`);

      testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.parameterName}`);
        console.log(`   Value: ${result.value}`);
        console.log(`   Unit: "${result.unit || '(empty)'}"`);
        console.log(`   Status: ${result.status}`);
        console.log('');
      });
    }

    console.log('\n✅ Check completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkReportParams();
