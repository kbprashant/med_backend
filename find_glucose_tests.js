const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findGlucoseTests() {
  const results = await prisma.testDefinition.findMany({
    where: {
      OR: [
        { parameterName: { contains: 'Glucose', mode: 'insensitive' } },
        { testName: { contains: 'Glucose', mode: 'insensitive' } },
      ]
    }
  });
  
  console.log('🔍 Glucose Tests in Master Data:\n');
  results.forEach(r => {
    console.log(`   ${r.testId}: ${r.parameterName} | "${r.testName}"`);
  });
  
  await prisma.$disconnect();
}

findGlucoseTests();
