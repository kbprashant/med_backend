const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumnType() {
  try {
    console.log('🔍 Checking test_results table structure...\n');
    
    // Query PostgreSQL to get column info
    const result = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'test_results'
        AND column_name = 'value'
    `;
    
    console.log('Column information:');
    console.table(result);
    
    // Also check a recent urine analysis record
    console.log('\n📋 Checking recent urine analysis records...\n');
    const recentRecords = await prisma.testResult.findMany({
      where: {
        testName: 'URINE_ANALYSIS'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        parameterName: true,
        value: true,
        unit: true
      }
    });
    
    console.log('Recent urine analysis test results:');
    console.table(recentRecords);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumnType();
