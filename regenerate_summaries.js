/**
 * Regenerate Health Summaries
 * Deletes old summaries and creates new ones based on current test results
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateHealthSummaries() {
  try {
    console.log('🗑️  Deleting old health summaries...');
    const deleted = await prisma.healthSummary.deleteMany({});
    console.log(`✅ Deleted ${deleted.count} old health summaries`);

    console.log('\n📊 Finding reports with test results...');
    const reports = await prisma.report.findMany({
      include: {
        testResults: true,
      },
      orderBy: { reportDate: 'desc' },
    });

    console.log(`📋 Found ${reports.length} reports`);

    let generatedCount = 0;

    for (const report of reports) {
      if (report.testResults.length === 0) {
        console.log(`⚠️  Skipping report ${report.id} - no test results`);
        continue;
      }

      console.log(`\n📊 Generating summary for report: ${report.testType} (${report.reportDate.toISOString().split('T')[0]})`);

      // Analyze test results
      const highValues = [];
      const lowValues = [];
      const criticalIssues = [];
      
      for (const result of report.testResults) {
        console.log(`   ${result.parameterName}: ${result.value} ${result.unit} - ${result.status}`);
        
        const status = result.status.toUpperCase(); // Normalize to uppercase
        
        if (status === 'HIGH') {
          highValues.push({
            parameter: result.parameterName,
            value: result.value,
            unit: result.unit,
            referenceRange: result.referenceRange
          });
          
          const value = parseFloat(result.value);
          if (
            (result.parameterName.includes('Glucose') && value > 200) ||
            (result.parameterName.includes('Blood sugar') && value > 200) ||
            (result.parameterName.includes('Cholesterol') && value > 240)
          ) {
            criticalIssues.push(result.parameterName);
          }
        } else if (status === 'LOW') {
          lowValues.push({
            parameter: result.parameterName,
            value: result.value,
            unit: result.unit,
            referenceRange: result.referenceRange
          });
        }
      }

      // Generate summary
      let summaryText = '';
      let insights = '';
      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';
      let keyIssues = [];
      let recommendations = [];

      const abnormalCount = highValues.length + lowValues.length;

      if (abnormalCount === 0) {
        summaryText = '✅ All test results are within normal ranges.\n\nGreat job maintaining your health!';
        overallStatus = 'NORMAL';
        riskLevel = 'LOW';
      } else {
        summaryText = `Test Report Analysis:\n\n`;
        
        if (highValues.length > 0) {
          summaryText += `🔴 High Values Detected (${highValues.length}):\n`;
          highValues.forEach(item => {
            summaryText += `• ${item.parameter}: ${item.value} ${item.unit} (Normal: ${item.referenceRange})\n`;
            keyIssues.push(`High ${item.parameter}`);
          });
          summaryText += '\n';
        }

        if (lowValues.length > 0) {
          summaryText += `🔵 Low Values Detected (${lowValues.length}):\n`;
          lowValues.forEach(item => {
            summaryText += `• ${item.parameter}: ${item.value} ${item.unit} (Normal: ${item.referenceRange})\n`;
            keyIssues.push(`Low ${item.parameter}`);
          });
          summaryText += '\n';
        }

        if (criticalIssues.length > 0) {
          overallStatus = 'CRITICAL';
          riskLevel = 'HIGH';
          insights = `🚨 Critical Issues:\n${criticalIssues.join(', ')} requires immediate medical attention.\n\n`;
          recommendations.push('Consult your doctor immediately');
          recommendations.push('Follow prescribed treatment plan');
        } else if (highValues.length > 2 || lowValues.length > 2) {
          overallStatus = 'CAUTION';
          riskLevel = 'MEDIUM';
          insights = `⚠️ Multiple parameters outside normal range. Regular monitoring recommended.\n\n`;
          recommendations.push('Schedule a follow-up appointment');
          recommendations.push('Monitor these values regularly');
        } else {
          overallStatus = 'CAUTION';
          riskLevel = 'LOW';
          insights = `📊 Some parameters need attention. Consult your healthcare provider for guidance.\n\n`;
          recommendations.push('Discuss results with your doctor');
          recommendations.push('Follow healthy lifestyle practices');
        }
      }

      // Create health summary
      const healthSummary = await prisma.healthSummary.create({
        data: {
          userId: report.userId,
          reportId: report.id,
          summaryText: summaryText,
          insights: insights || null,
          overallStatus: overallStatus,
          abnormalCount: abnormalCount,
          riskLevel: riskLevel,
          keyIssues: JSON.stringify(keyIssues),
          recommendations: JSON.stringify(recommendations),
        }
      });

      console.log(`✅ Created health summary: ${healthSummary.overallStatus} (${healthSummary.riskLevel} risk)`);
      generatedCount++;
    }

    console.log(`\n✅ Regenerated ${generatedCount} health summaries`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateHealthSummaries();
