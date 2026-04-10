/**
 * Update Health Summary for Blood Glucose Report
 * 
 * Regenerate the health summary with correct status based on the actual test results
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateHealthSummary() {
  try {
    console.log('🔄 Updating Health Summary\n');
    
    // Find the blood glucose report - specific one we just fixed
    const report = await prisma.report.findUnique({
      where: {
        id: 'aa7623cf-5bfd-47de-b180-ac806cee6546' // The one we just fixed with correct HIGH values
      },
      include: {
        testResults: true
      }
    });

    if (!report) {
      console.log('❌ No blood glucose report found');
      return;
    }

    console.log(`📄 Report ID: ${report.id}`);
    console.log(`   Test Results: ${report.testResults.length}\n`);

    // Display current test results
    console.log('📊 Current Test Results:');
    report.testResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
    });
    console.log('');

    // Calculate health summary
    const totalTests = report.testResults.length;
    const abnormalCount = report.testResults.filter(r => r.status !== 'NORMAL').length;
    const highCount = report.testResults.filter(r => r.status === 'HIGH').length;
    const lowCount = report.testResults.filter(r => r.status === 'LOW').length;
    const abnormalPercentage = totalTests > 0 ? (abnormalCount / totalTests) * 100 : 0;

    console.log('📈 Analysis:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Abnormal: ${abnormalCount} (${abnormalPercentage.toFixed(1)}%)`);
    console.log(`   High: ${highCount}`);
    console.log(`   Low: ${lowCount}\n`);

    // Determine status and risk level
    let overallStatus = 'NORMAL';
    let riskLevel = 'LOW';

    if (abnormalPercentage > 50) {
      overallStatus = 'CRITICAL';
      riskLevel = 'HIGH';
    } else if (abnormalPercentage > 20) {
      overallStatus = 'CAUTION';
      riskLevel = 'MEDIUM';
    } else if (abnormalCount > 0) {
      overallStatus = 'CAUTION';
      riskLevel = 'MEDIUM';
    }

    // Generate summary text
    let summaryText = '';
    
    if (abnormalCount === 0) {
      summaryText = '✅ All test results are within normal ranges.\n\nGreat job maintaining your health!';
    } else {
      summaryText = `⚠️ ${abnormalCount} out of ${totalTests} test result(s) are outside normal range.\n\n`;
      
      if (highCount > 0) {
        summaryText += `• High values detected: `;
        const highResults = report.testResults.filter(r => r.status === 'HIGH');
        summaryText += highResults.map(r => r.parameterName).join(', ') + '\n';
      }
      
      if (lowCount > 0) {
        summaryText += `• Low values detected: `;
        const lowResults = report.testResults.filter(r => r.status === 'LOW');
        summaryText += lowResults.map(r => r.parameterName).join(', ') + '\n';
      }
      
      summaryText += '\n⚕️ Please consult your healthcare provider for proper medical advice.';
    }

    console.log('📝 New Summary:');
    console.log(`   Overall Status: ${overallStatus}`);
    console.log(`   Risk Level: ${riskLevel}`);
    console.log(`   Summary Text: ${summaryText.substring(0, 100)}...\n`);

    // Delete old health summary for this report
    await prisma.healthSummary.deleteMany({
      where: {
        reportId: report.id
      }
    });
    console.log('🗑️  Deleted old health summary\n');

    // Create new health summary
    const healthSummary = await prisma.healthSummary.create({
      data: {
        userId: report.userId,
        reportId: report.id,
        summaryText: summaryText,
        overallStatus: overallStatus,
        abnormalCount: abnormalCount,
        riskLevel: riskLevel
      }
    });

    console.log('='.repeat(70));
    console.log('✅ HEALTH SUMMARY UPDATED');
    console.log('='.repeat(70));
    console.log(`Summary ID: ${healthSummary.id}`);
    console.log(`Overall Status: ${healthSummary.overallStatus}`);
    console.log(`Risk Level: ${healthSummary.riskLevel}`);
    console.log(`Abnormal Count: ${healthSummary.abnormalCount}`);
    console.log('\nThe app should now show the correct health summary!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateHealthSummary();
