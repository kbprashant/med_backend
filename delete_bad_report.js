const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportId = 'fd35a09b-da14-45eb-85c2-5e239124b51a';
    
    console.log('🗑️  Deleting report with bad extraction...');
    
    // Delete test results first (cascade should handle this, but being explicit)
    await prisma.testResult.deleteMany({
      where: { reportId }
    });
    console.log('✅ Deleted test results');
    
    // Delete the report
    await prisma.report.delete({
      where: { id: reportId }
    });
    console.log('✅ Deleted report');
    
    console.log('\n✨ Database cleaned! Please re-upload the report from the app.');
    console.log('   The backend will now handle the extraction correctly.');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
