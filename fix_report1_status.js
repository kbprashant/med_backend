/**
 * Fix Report 1 Blood Glucose Status Values
 * 
 * Report ID: 05b88de5-6887-4044-992a-8e8c74096211
 * - Blood sugar Fasting: 138 mg/dl - should be HIGH (reference: 60-110)
 * - Blood sugar Post Prandial: 254 mg/dl - should be HIGH (reference: 90-140)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixReport1Status() {
  try {
    console.log('🔧 Fixing Report 1 Blood Glucose Status\n');
    
    const reportId = '05b88de5-6887-4044-992a-8e8c74096211';
    
    // Get all test results for this report
    const testResults = await prisma.testResult.findMany({
      where: {
        reportId: reportId
      }
    });

    console.log(`Found ${testResults.length} test results:\n`);

    // Update statuses
    for (const result of testResults) {
      const value = parseFloat(result.value);
      let newStatus = result.status;
      
      // Blood Sugar Fasting: reference 60-110 mg/dl
      if (/fasting/i.test(result.parameterName)) {
        if (value < 60) {
          newStatus = 'LOW';
        } else if (value > 110) {
          newStatus = 'HIGH';
        } else {
          newStatus = 'NORMAL';
        }
      }
      
      // Blood Sugar Post Prandial: reference 90-140 mg/dl
      if (/post.*prandial|pp/i.test(result.parameterName)) {
        if (value < 90) {
          newStatus = 'LOW';
        } else if (value > 140) {
          newStatus = 'HIGH';
        } else {
          newStatus = 'NORMAL';
        }
      }
      
      // Blood Pressure Systolic: reference <120 mmHg
      if (/systolic/i.test(result.parameterName)) {
        if (value > 140) {
          newStatus = 'HIGH';
        } else if (value > 120) {
          newStatus = 'CAUTION';
        } else {
          newStatus = 'NORMAL';
        }
      }
      
      // Blood Pressure Diastolic: reference <80 mmHg
      if (/diastolic/i.test(result.parameterName)) {
        if (value > 90) {
          newStatus = 'HIGH';
        } else if (value > 80) {
          newStatus = 'CAUTION';
        } else {
          newStatus = 'NORMAL';
        }
      }
      
      // Pulse: reference 60-100 bpm
      if (/pulse/i.test(result.parameterName)) {
        if (value < 60) {
          newStatus = 'LOW';
        } else if (value > 100) {
          newStatus = 'HIGH';
        } else {
          newStatus = 'NORMAL';
        }
      }

      if (newStatus !== result.status) {
        await prisma.testResult.update({
          where: { id: result.id },
          data: { status: newStatus }
        });
        console.log(`✅ Updated: ${result.parameterName}: ${result.value} ${result.unit}`);
        console.log(`   ${result.status} → ${newStatus}`);
      } else {
        console.log(`✓ Unchanged: ${result.parameterName}: ${result.value} ${result.unit} [${newStatus}]`);
      }
    }

    console.log('\n' + '='.repeat(70));
    
    // Now update the health summary
    const updatedResults = await prisma.testResult.findMany({
      where: { reportId }
    });

    const totalTests = updatedResults.length;
    const abnormalCount = updatedResults.filter(r => r.status !== 'NORMAL').length;
    const highCount = updatedResults.filter(r => r.status === 'HIGH').length;
    const cautionCount = updatedResults.filter(r => r.status === 'CAUTION').length;
    const abnormalPercentage = (abnormalCount / totalTests) * 100;

    let overallStatus = 'NORMAL';
    let riskLevel = 'LOW';

    if (abnormalPercentage > 50) {
      overallStatus = 'CRITICAL';
      riskLevel = 'HIGH';
    } else if (abnormalPercentage > 20 || highCount > 0) {
      overallStatus = 'CAUTION';
      riskLevel = 'MEDIUM';
    }

    let summaryText = `⚠️ ${abnormalCount} out of ${totalTests} test result(s) are outside normal range.\n\n`;
    
    if (highCount > 0) {
      summaryText += `• High values detected: `;
      const highResults = updatedResults.filter(r => r.status === 'HIGH');
      summaryText += highResults.map(r => r.parameterName).join(', ') + '\n';
    }
    
    if (cautionCount > 0) {
      summaryText += `• Elevated values: `;
      const cautionResults = updatedResults.filter(r => r.status === 'CAUTION');
      summaryText += cautionResults.map(r => r.parameterName).join(', ') + '\n';
    }
    
    summaryText += '\n⚕️ Please consult your healthcare provider for proper medical advice.';

    // Delete old heath summary and create new one
    await prisma.healthSummary.deleteMany({
      where: { reportId }
    });

    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    const healthSummary = await prisma.healthSummary.create({
      data: {
        userId: report.userId,
        reportId: reportId,
        summaryText: summaryText,
        overallStatus: overallStatus,
        abnormalCount: abnormalCount,
        riskLevel: riskLevel
      }
    });

    console.log('✅ HEALTH SUMMARY UPDATED');
    console.log('='.repeat(70));
    console.log(`Overall Status: ${healthSummary.overallStatus}`);
    console.log(`Risk Level: ${healthSummary.riskLevel}`);
    console.log(`Abnormal Count: ${healthSummary.abnormalCount}`);
    console.log('\nBoth blood glucose reports now have correct statuses!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReport1Status();
