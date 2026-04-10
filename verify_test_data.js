/**
 * Script to verify test results data in the database
 * Usage: node verify_test_data.js <userId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTestData(userId) {
  try {
    console.log('='.repeat(70));
    console.log('VERIFYING TEST DATA FOR USER:', userId);
    console.log('='.repeat(70));
    console.log();

    // Get all reports for user
    const reports = await prisma.report.findMany({
      where: { userId },
      include: {
        testResults: true,
      },
      orderBy: { reportDate: 'desc' },
    });

    console.log(`📊 REPORTS FOUND: ${reports.length}\n`);

    if (reports.length === 0) {
      console.log('No reports found for this user.');
      console.log('Run: node add_sample_test_data.js <userId>');
      return;
    }

    // Display each report with its test results
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.testType}`);
      console.log(`   Date: ${report.reportDate.toDateString()}`);
      console.log(`   Report ID: ${report.id}`);
      console.log(`   Test Results: ${report.testResults.length}`);

      if (report.testResults.length > 0) {
        console.log('   Results:');
        report.testResults.forEach((result) => {
          console.log(
            `     - ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`
          );
        });
      }
      console.log();
    });

    // Get test history for each test type
    const testTypes = [...new Set(reports.map((r) => r.testType))];

    console.log('='.repeat(70));
    console.log('TEST HISTORY BY TYPE');
    console.log('='.repeat(70));
    console.log();

    for (const testType of testTypes) {
      const testResults = await prisma.testResult.findMany({
        where: {
          report: { userId },
          testName: testType,
        },
        orderBy: { testDate: 'asc' },
        include: {
          report: {
            select: {
              reportDate: true,
            },
          },
        },
      });

      console.log(`📈 ${testType} (${testResults.length} results)`);

      // Group by parameter name
      const byParameter = {};
      testResults.forEach((result) => {
        if (!byParameter[result.parameterName]) {
          byParameter[result.parameterName] = [];
        }
        byParameter[result.parameterName].push(result);
      });

      Object.entries(byParameter).forEach(([param, results]) => {
        console.log(`   ${param}:`);
        results.forEach((r) => {
          console.log(
            `     ${r.testDate.toDateString()}: ${r.value} ${r.unit} [${r.status}]`
          );
        });
      });
      console.log();
    }

    // Get health summaries
    const summaries = await prisma.healthSummary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('='.repeat(70));
    console.log('HEALTH SUMMARIES');
    console.log('='.repeat(70));
    console.log();

    if (summaries.length === 0) {
      console.log('No health summaries found.');
    } else {
      summaries.forEach((summary, index) => {
        console.log(`${index + 1}. Report ID: ${summary.reportId}`);
        console.log(`   Overall Status: ${summary.overallStatus}`);
        console.log(`   Risk Level: ${summary.riskLevel}`);
        console.log(`   Abnormal Count: ${summary.abnormalCount}`);
        console.log(`   Created: ${summary.createdAt.toDateString()}`);
        console.log(`   Summary:`);
        console.log(
          summary.summaryText
            .split('\n')
            .map((line) => `     ${line}`)
            .join('\n')
        );
        console.log();
      });
    }

    // Summary statistics
    console.log('='.repeat(70));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(70));
    console.log();

    const totalResults = reports.reduce(
      (sum, r) => sum + r.testResults.length,
      0
    );
    const normalResults = await prisma.testResult.count({
      where: {
        report: { userId },
        status: 'NORMAL',
      },
    });
    const highResults = await prisma.testResult.count({
      where: {
        report: { userId },
        status: 'HIGH',
      },
    });
    const lowResults = await prisma.testResult.count({
      where: {
        report: { userId },
        status: 'LOW',
      },
    });

    console.log(`Total Reports: ${reports.length}`);
    console.log(`Total Test Results: ${totalResults}`);
    console.log(`Normal Results: ${normalResults}`);
    console.log(`High Results: ${highResults}`);
    console.log(`Low Results: ${lowResults}`);
    console.log(`Health Summaries: ${summaries.length}`);
    console.log();

    console.log('='.repeat(70));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(70));

    // Test API queries
    console.log('\n📡 Testing API Query Patterns:\n');

    console.log('1. Get Thyroid Test history:');
    console.log('   GET /api/reports/tests/history?testName=Thyroid Test');

    const thyroidHistory = await prisma.testResult.findMany({
      where: {
        report: { userId },
        testName: 'Thyroid Test',
      },
      orderBy: { testDate: 'asc' },
    });
    console.log(`   ✓ Would return ${thyroidHistory.length} results\n`);

    console.log('2. Get recent Blood Sugar tests (limit 3):');
    console.log('   GET /api/reports/tests/recent?testName=Blood Sugar Test&limit=3');

    const recentBloodSugar = await prisma.testResult.findMany({
      where: {
        report: { userId },
        testName: 'Blood Sugar Test',
      },
      orderBy: { testDate: 'desc' },
      take: 3,
    });
    console.log(`   ✓ Would return ${recentBloodSugar.length} results\n`);

    console.log('3. Get full test history:');
    console.log('   GET /api/reports/tests/full-history?testName=Thyroid Test');

    const fullHistory = await prisma.testResult.findMany({
      where: {
        report: { userId },
        testName: 'Thyroid Test',
      },
      orderBy: { testDate: 'desc' },
    });
    console.log(`   ✓ Would return ${fullHistory.length} results\n`);
  } catch (error) {
    console.error('Error verifying test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Error: userId is required');
  console.error('Usage: node verify_test_data.js <userId>');
  process.exit(1);
}

verifyTestData(userId);
