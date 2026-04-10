/**
 * Fix test result statuses for normalized reports
 * 
 * This script recalculates statuses for all test results using the
 * reference ranges database and updates health summaries accordingly.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { determineStatus, getReferenceRangeText } = require('./services/referenceRanges');

async function fixAllTestResultStatuses() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 FIX TEST RESULT STATUSES');
    console.log('='.repeat(70));

    // Get all test results
    const testResults = await prisma.testResult.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Found ${testResults.length} test results to check\n`);

    let updatedCount = 0;
    const reportIds = new Set();

    for (const result of testResults) {
      // Determine correct status based on reference ranges
      const correctStatus = determineStatus(
        result.parameterName,
        result.value,
        result.unit
      );

      // Check if status needs updating
      if (result.status !== correctStatus) {
        console.log(`🔄 Updating: ${result.parameterName}`);
        console.log(`   Value: ${result.value} ${result.unit}`);
        console.log(`   Status: ${result.status} → ${correctStatus}`);
        
        // Get reference range text
        const refRange = getReferenceRangeText(result.parameterName);
        
        // Update the test result
        await prisma.testResult.update({
          where: { id: result.id },
          data: {
            status: correctStatus,
            referenceRange: refRange || result.referenceRange
          }
        });

        updatedCount++;
        reportIds.add(result.reportId);
      } else {
        console.log(`✓ OK: ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} test results\n`);

    // Regenerate health summaries for affected reports
    if (reportIds.size > 0) {
      console.log('='.repeat(70));
      console.log('📊 REGENERATING HEALTH SUMMARIES');
      console.log('='.repeat(70));
      console.log(`\n🔄 Updating health summaries for ${reportIds.size} reports\n`);

      for (const reportId of reportIds) {
        await regenerateHealthSummary(reportId);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL FIXES COMPLETE');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function regenerateHealthSummary(reportId) {
  try {
    // Get report with user ID
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      console.log(`   ⚠️  Report ${reportId} not found`);
      return;
    }

    // Get all test results for this report
    const testResults = await prisma.testResult.findMany({
      where: { reportId }
    });

    if (testResults.length === 0) {
      console.log(`   ⚠️  No test results for report ${reportId}`);
      return;
    }

    // Count abnormal results
    const highValues = testResults.filter(r => r.status === 'HIGH');
    const lowValues = testResults.filter(r => r.status === 'LOW');
    const abnormalCount = highValues.length + lowValues.length;
    const totalCount = testResults.length;

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
      where: { reportId }
    });

    // Create new health summary
    await prisma.healthSummary.create({
      data: {
        userId: report.userId,
        reportId,
        overallStatus,
        abnormalCount,
        riskLevel,
        summaryText
      }
    });

    console.log(`   ✅ Report: ${report.testType || reportId.substring(0, 8)}`);
    console.log(`      Status: ${overallStatus}, Risk: ${riskLevel}, Abnormal: ${abnormalCount}/${totalCount}`);

  } catch (error) {
    console.error(`   ❌ Error regenerating summary for ${reportId}:`, error.message);
  }
}

// Run the fix
fixAllTestResultStatuses()
  .then(() => {
    console.log('\n✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
