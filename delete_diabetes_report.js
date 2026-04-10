const prisma = require('./config/database');

async function deleteReport() {
  try {
    const reportId = 'e910b42d-195a-45e0-ae0f-4b4c97f84fc1';
    
    console.log('🗑️  Deleting old report with wrong data...\n');
    
    // Delete test results first
    const deletedResults = await prisma.testResult.deleteMany({
      where: { reportId: reportId }
    });
    console.log(`✅ Deleted ${deletedResults.count} test results`);

    // Delete the report
    await prisma.report.delete({
      where: { id: reportId }
    });
    console.log('✅ Deleted report\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 NOW: Upload your glucose report again!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nThe NEW PARSER will:');
    console.log('  ✅ Detect it as "Blood Glucose Test"');
    console.log('  ✅ Extract ONLY 2 parameters:');
    console.log('     - Fasting Glucose');
    console.log('     - Post Prandial Glucose');
    console.log('  ❌ NO Hemoglobin');
    console.log('  ❌ NO Blood Pressure');
    console.log('  ✅ Show correct status: 2/2 extracted\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteReport();
