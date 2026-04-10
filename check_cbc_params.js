const prisma = require('./config/database');

async function checkCBCParameters() {
  try {
    console.log('🔍 Checking all reports in database...\n');
    
    // Find all reports first to see what we have
    const allReports = await prisma.report.findMany({
      include: {
        testResults: true
      },
      orderBy: {
        reportDate: 'desc'
      }
    });

    console.log(`📊 Total Reports: ${allReports.length}\n`);
    
    if (allReports.length === 0) {
      console.log('❌ No reports found in database');
      return;
    }

    // List all reports
    console.log('All Reports:');
    console.log('='.repeat(80));
    allReports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.testType} (${report.category}) - ${report.testResults.length} parameters`);
      console.log(`   Date: ${report.reportDate}`);
      console.log(`   ID: ${report.id}`);
    });
    
    // Now find CBC/Blood Count reports
    console.log('\n' + '='.repeat(80));
    console.log('Looking for CBC/Blood Count reports...\n');
    
    const cbcReports = allReports.filter(r => 
      r.testType.toLowerCase().includes('cbc') || 
      r.testType.toLowerCase().includes('blood count')
    );
    
    if (cbcReports.length === 0) {
      console.log('❌ No CBC/Blood Count reports found');
      return;
    }

    const report = cbcReports[0];
    console.log(`📋 Report: ${report.testType}`);
    console.log(`📅 Date: ${report.reportDate}`);
    console.log(`🧪 Test Results Count: ${report.testResults.length}\n`);
    
    console.log('Parameters in Database:');
    console.log('='.repeat(80));
    report.testResults.forEach((tr, index) => {
      const statusEmoji = tr.status === 'HIGH' ? '🔴' : tr.status === 'LOW' ? '🔵' : '✅';
      console.log(`${index + 1}. ${statusEmoji} ${tr.parameterName}: ${tr.value} ${tr.unit} [${tr.status}]`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Total: ${report.testResults.length} parameters found in database`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCBCParameters();
