/**
 * Quick check: View thyroid test results with units from database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkThyroidUnits() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CHECKING THYROID TEST UNITS IN DATABASE');
  console.log('='.repeat(70) + '\n');

  try {
    const thyroidParams = ['FT3', 'FT4', 'TSH', 'T3 Total', 'T4 Total'];
    
    const results = await prisma.testResult.findMany({
      where: {
        OR: thyroidParams.map(param => ({
          parameterName: param
        }))
      },
      select: {
        id: true,
        parameterName: true,
        value: true,
        unit: true,
        status: true,
        testDate: true
      },
      orderBy: [
        { testDate: 'desc' },
        { parameterName: 'asc' }
      ]
    });

    console.log(`Found ${results.length} thyroid test results:\n`);
    
    results.forEach((result, i) => {
      const statusEmoji = result.status === 'NORMAL' ? '✅' : 
                         result.status === 'HIGH' ? '⬆️' : '⬇️';
      const unitDisplay = result.unit ? `"${result.unit}"` : '❌ MISSING';
      console.log(`${i + 1}. [${result.testDate.toLocaleDateString()}] ${result.parameterName}`);
      console.log(`   Value: ${result.value}`);
      console.log(`   Unit: ${unitDisplay}`);
      console.log(`   Status: ${statusEmoji} ${result.status}`);
      console.log(`   ID: ${result.id}\n`);
    });

    // Check for missing units
    const missingUnits = results.filter(r => !r.unit || r.unit.trim() === '');
    if (missingUnits.length > 0) {
      console.log('⚠️  WARNING: Found results with missing units:');
      missingUnits.forEach(r => {
        console.log(`   - ${r.parameterName}: ${r.value} (ID: ${r.id})`);
      });
    } else {
      console.log('✅ All thyroid results have units!');
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkThyroidUnits();
