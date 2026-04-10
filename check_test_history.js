const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestHistory() {
  try {
    const userId = 'a35b4c73-cc51-4b5c-82ab-b33ab171267d';
    
    console.log('\n📊 Recent Test Results:');
    const results = await prisma.testResult.findMany({
      where: {
        report: { userId }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        report: {
          select: {
            testType: true,
            reportDate: true
          }
        }
      }
    });
    
    console.log(`\nFound ${results.length} test results:`);
    results.forEach((r, i) => {
      console.log(`\n${i + 1}. Parameter: ${r.parameterName}`);
      console.log(`   Test Name: ${r.testName}`);
      console.log(`   Value: ${r.value} ${r.unit}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Report testType: ${r.report.testType}`);
      console.log(`   Date: ${r.testDate || r.report.reportDate}`);
    });
    
    console.log('\n\n🔍 Testing query with testName="Diabetes Panel":');
    const diabetesResults = await prisma.testResult.findMany({
      where: {
        report: {
          userId,
          testType: 'Diabetes Panel'
        }
      }
    });
    console.log(`Found ${diabetesResults.length} results`);
    
    console.log('\n🔍 Testing query with testType="diabetes":');
    const diabetesResults2 = await prisma.testResult.findMany({
      where: {
        report: {
          userId,
          testType: 'diabetes'
        }
      }
    });
    console.log(`Found ${diabetesResults2.length} results`);
    
    console.log('\n🔍 Testing query with testName field:');
    const testNameResults = await prisma.testResult.findMany({
      where: {
        report: { userId },
        testName: 'Blood Sugar Test'
      }
    });
    console.log(`Found ${testNameResults.length} results with testName="Blood Sugar Test"`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestHistory();
