const prisma = require('./config/database');

async function checkFinalResults() {
  try {
    const results = await prisma.testResult.findMany({
      where: { reportId: 'dcc60e74-ea46-4894-97a3-644190265933' },
      orderBy: { createdAt: 'asc' }
    });

    console.log('\n📊 FINAL DATABASE RESULTS (16 parameters):\n');
    console.log('='.repeat(70));
    results.forEach((p, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${p.parameterName.padEnd(35)} ${p.value.toString().padStart(6)} ${p.unit.padEnd(10)} [${p.status}]`);
    });
    console.log('='.repeat(70));
    console.log(`\n✅ Total: ${results.length} parameters extracted and saved`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFinalResults();
