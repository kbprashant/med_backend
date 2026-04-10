const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listBloodGlucoseReports() {
  try {
    console.log('📋 Listing All Blood Glucose Reports\n');
    
    const reports = await prisma.report.findMany({
      where: {
        testType: 'Blood Glucose Test'
      },
      include: {
        testResults: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${reports.length} blood glucose reports:\n`);

    reports.forEach((report, index) => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Report ${index + 1}:`);
      console.log(`${'='.repeat(70)}`);
      console.log(`ID: ${report.id}`);
      console.log(`Created: ${report.createdAt}`);
      console.log(`Test Results: ${report.testResults.length}`);
      console.log('');
      
      if (report.testResults.length > 0) {
        console.log('Test Results:');
        report.testResults.forEach((result, idx) => {
          console.log(`   ${idx + 1}. ${result.parameterName}: ${result.value} ${result.unit || ''} [${result.status}]`);
        });
      } else {
        console.log('   (No test results)');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listBloodGlucoseReports();
