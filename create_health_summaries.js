const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Creating Health Summaries for Existing Reports ===\n');
    
    // Get all reports with their test results
    const reports = await prisma.report.findMany({
      include: {
        testResults: true,
      },
      orderBy: {
        reportDate: 'desc'
      }
    });

    console.log(`Found ${reports.length} reports`);

    for (const report of reports) {
      // Check if health summary already exists
      const existingSummary = await prisma.healthSummary.findFirst({
        where: {
          reportId: report.id
        }
      });

      if (existingSummary) {
        console.log(`✓ Health summary already exists for ${report.testType} report from ${new Date(report.reportDate).toLocaleDateString()}`);
        continue;
      }

      // Only create summary if report has test results
      if (report.testResults.length === 0) {
        console.log(`⊘ Skipping ${report.testType} report (no test results)`);
        continue;
      }

      // Calculate health summary
      const totalTests = report.testResults.length;
      const abnormalCount = report.testResults.filter(
        (r) => r.status !== 'NORMAL'
      ).length;
      const abnormalPercentage = (abnormalCount / totalTests) * 100;

      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';

      if (abnormalPercentage > 50) {
        overallStatus = 'CRITICAL';
        riskLevel = 'HIGH';
      } else if (abnormalPercentage > 20) {
        overallStatus = 'CAUTION';
        riskLevel = 'MEDIUM';
      }

      const summaryText = `Test Report Summary for ${report.testType}:\n- Total parameters tested: ${totalTests}\n- Abnormal results: ${abnormalCount}\n- Overall Status: ${overallStatus}`;

      // Create health summary
      await prisma.healthSummary.create({
        data: {
          userId: report.userId,
          reportId: report.id,
          summaryText,
          overallStatus,
          abnormalCount,
          riskLevel,
        },
      });

      console.log(`✓ Created health summary for ${report.testType} report from ${new Date(report.reportDate).toLocaleDateString()} - Status: ${overallStatus}, Risk: ${riskLevel}`);
    }

    console.log('\n=== Summary ===');
    const totalSummaries = await prisma.healthSummary.count();
    console.log(`Total health summaries: ${totalSummaries}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
