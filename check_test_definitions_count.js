const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.testDefinition.count();
    console.log(`Test definitions in database: ${count}`);
    
    if (count === 0) {
      console.log('\n⚠️  No test definitions found! Run: node populate_test_definitions.js');
    } else {
      console.log('✅ Test definitions are populated');
      
      // Show some examples
      const samples = await prisma.testDefinition.findMany({
        take: 5,
        select: {
          id: true,
          testId: true,
          categoryName: true,
          testName: true,
          parameterName: true,
        },
      });
      
      console.log('\nSample test definitions:');
      samples.forEach(def => {
        console.log(`  - ${def.parameterName} (ID: ${def.id})`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
