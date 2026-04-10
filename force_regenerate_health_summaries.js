/**
 * Force regenerate health summaries for all reports
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAllHealthSummaries() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📊 FORCE REGENERATE HEALTH SUMMARIES');
    console.log('='.repeat(70));

    // Get all reports
    const reports = await prisma.report.findMany({
      include: {
        testResults: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📋 Found ${reports.length} reports\n`);

    for (const report of reports) {
      if (report.testResults.length === 0) {
        console.log(`⊘ Skipping ${report.testType || report.id.substring(0, 8)} - no test results`);
        continue;
      }

      // Count abnormal results
      const highValues = report.testResults.filter(r => r.status === 'HIGH' || r.status === 'CRITICAL_HIGH');
      const lowValues = report.testResults.filter(r => r.status === 'LOW' || r.status === 'CRITICAL_LOW');
      const abnormalCount = highValues.length + lowValues.length;
      const totalCount = report.testResults.length;

      // Calculate overall status and risk level
      const abnormalPercentage = (abnormalCount / totalCount) * 100;
      
      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';
      
      if (abnormalPercentage > 50) {
        overallStatus = 'CRITICAL';
        riskLevel = 'HIGH';
      } else if (abnormalPercentage > 20) {
        overallStatus = 'CAUTION';
        riskLevel = 'MEDIUM';
      }

      // Build summary text
      let summaryText = `⚠️ ${abnormalCount} out of ${totalCount} test result(s) are outside normal range.\n\n`;
      
      if (highValues.length > 0) {
        summaryText += `• High values detected: ${highValues.map(r => r.parameterName).join(', ')}\n`;
      }
      
      if (lowValues.length > 0) {
        summaryText += `• Low values detected: ${lowValues.map(r => r.parameterName).join(', ')}\n`;
      }
      
      summaryText += '\n⚕️ Please consult your healthcare provider for proper medical advice.';

      // Delete old health summary
      await prisma.healthSummary.deleteMany({
        where: { reportId: report.id }
      });

      // Create new health summary
      await prisma.healthSummary.create({
        data: {
          userId: report.userId,
          reportId: report.id,
          overallStatus,
          abnormalCount,
          riskLevel,
          summaryText
        }
      });

      console.log(`✅ ${report.testType || report.id.substring(0, 8)}`);
      console.log(`   Status: ${overallStatus}, Risk: ${riskLevel}, Abnormal: ${abnormalCount}/${totalCount}`);
      console.log(`   Tests: ${report.testResults.map(r => `${r.parameterName} (${r.status})`).join(', ')}`);
      console.log();
    }

    console.log('='.repeat(70));
    console.log('✅ ALL HEALTH SUMMARIES REGENERATED');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

regenerateAllHealthSummaries()
  .then(() => {
    console.log('\n✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
