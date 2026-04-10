const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: 'f6d80108-c8b3-429d-8a05-822c325362ca' },
      include: { testResults: true },
    });
    
    console.log('Report Type:', report.testType);
    console.log('Category:', report.category);
    console.log('Subcategory:', report.subcategory);
    console.log('\nTest Results:');
    report.testResults.forEach(t => {
      console.log(`  - ${t.parameterName}: ${t.value} ${t.unit || ''} (${t.status})`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
