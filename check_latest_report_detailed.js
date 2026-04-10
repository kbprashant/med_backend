const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('📊 Checking latest report...\n');
    
    const report = await prisma.report.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        testResults: {
          orderBy: { parameterName: 'asc' },
        },
      },
    });

    if (!report) {
      console.log('No reports found');
      await prisma.$disconnect();
      return;
    }

    console.log('Report Details:');
    console.log(`  ID: ${report.id}`);
    console.log(`  Test Type: ${report.testType}`);
    console.log(`  Category: ${report.category}`);
    console.log(`  Subcategory: ${report.subcategory || 'N/A'}`);
    console.log(`  Report Date: ${report.reportDate}`);
    console.log(`  Created At: ${report.createdAt}`);
    console.log(`  Test Results: ${report.testResults.length}\n`);

    console.log('OCR Text Preview:');
    console.log(report.ocrText?.substring(0, 500) || 'N/A');
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('Test Results:');
    report.testResults.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.parameterName}`);
      console.log(`   Value: ${result.value} ${result.unit || ''}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Reference Range: ${result.referenceRange || 'N/A'}`);
      console.log(`   Normal Range: ${result.normalMin}-${result.normalMax}`);
      console.log(`   Test Definition ID: ${result.testDefinitionId || 'NULL'}`);
      console.log(`   Test Category: ${result.testCategory}`);
      console.log(`   Test Sub-Category: ${result.testSubCategory || 'N/A'}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
