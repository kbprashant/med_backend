const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestUrineReport() {
  try {
    console.log('🔍 Checking latest URINE_ANALYSIS report...\n');
    
    // Get the most recent urine analysis report
    const latestReport = await prisma.report.findFirst({
      where: {
        testType: 'URINE_ANALYSIS'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        testResults: {
          orderBy: {
            parameterName: 'asc'
          }
        }
      }
    });
    
    if (!latestReport) {
      console.log('❌ No urine analysis reports found');
      return;
    }
    
    console.log(`📋 Report ID: ${latestReport.id}`);
    console.log(`📅 Report Date: ${latestReport.reportDate}`);
    console.log(`📊 Test Results: ${latestReport.testResults.length}\n`);
    
    console.log('Parameters and Values:');
    latestReport.testResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.parameterName}: "${result.value}" (${typeof result.value}) ${result.unit || ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestUrineReport();
