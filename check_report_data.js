require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const userId = 'a33ef6bd-a588-4ff7-95ce-1160ccb15ea1'; // Kavi Priya
    
    console.log('=== Checking Reports and Test Results ===\n');
    
    const reports = await prisma.report.findMany({
      where: { userId },
      include: {
        testResults: true,
      },
      orderBy: { reportDate: 'desc' },
    });
    
    console.log(`Found ${reports.length} reports:\n`);
    
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.testType} - ${report.reportDate.toDateString()}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Test Results: ${report.testResults.length}`);
      if (report.testResults.length > 0) {
        report.testResults.forEach(result => {
          console.log(`     - ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
        });
      } else {
        console.log('     NO TEST RESULTS FOUND!');
      }
      console.log();
    });
    
    // Check total test results
    const totalTestResults = await prisma.testResult.count({
      where: {
        report: { userId }
      }
    });
    
    console.log(`\nTotal test results in database: ${totalTestResults}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
