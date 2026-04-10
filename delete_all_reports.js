const prisma = require('./config/database');

async function deleteAllReports() {
  try {
    console.log('🗑️  Deleting all reports from today...\n');
    
    // Delete all test results first
    const deletedResults = await prisma.testResult.deleteMany({});
    console.log(`✅ Deleted ${deletedResults.count} test results`);

    // Delete all reports
    const deletedReports = await prisma.report.deleteMany({});
    console.log(`✅ Deleted ${deletedReports.count} reports\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database cleaned!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 ACTION REQUIRED:');
    console.log('  1. HOT RESTART your Flutter app (not just hot reload)');
    console.log('  2. Upload your glucose report');
    console.log('\nNEW PARSER will extract correctly:');
    console.log('  ✅ Fasting Glucose + Post Prandial ONLY');
    console.log('  ❌ No Blood Pressure');
    console.log('  ❌ No Hemoglobin\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllReports();
