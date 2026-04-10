const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMasterTables() {
  try {
    console.log('📊 Checking Master Data Tables...\n');
    
    const testMaster = await prisma.testMaster.count();
    const testDef = await prisma.testDefinition.count();
    const testParam = await prisma.testParameter.count();
    const labCenter = await prisma.labCenter.count();
    const reports = await prisma.report.count();
    const testResults = await prisma.testResult.count();
    
    console.log('Table Status:');
    console.log('='.repeat(50));
    console.log(`TestMaster:       ${testMaster} records`);
    console.log(`TestDefinition:   ${testDef} records`);
    console.log(`TestParameter:    ${testParam} records`);
    console.log(`LabCenter:        ${labCenter} records`);
    console.log(`Reports:          ${reports} records`);
    console.log(`TestResults:      ${testResults} records`);
    console.log('='.repeat(50));
    
    // Check linkage
    console.log('\n🔗 Master Data Linkage:');
    console.log('='.repeat(50));
    
    const linkedResults = await prisma.testResult.count({
      where: {
        testDefinitionId: { not: null }
      }
    });
    
    const linkedToParams = await prisma.testResult.count({
      where: {
        parameterId: { not: null }
      }
    });
    
    const reportsWithLab = await prisma.report.count({
      where: {
        centerId: { not: null }
      }
    });
    
    console.log(`TestResults linked to TestDefinition: ${linkedResults}/${testResults}`);
    console.log(`TestResults linked to TestParameter:  ${linkedToParams}/${testResults}`);
    console.log(`Reports linked to LabCenter:          ${reportsWithLab}/${reports}`);
    console.log('='.repeat(50));
    
    if (testMaster === 0) {
      console.log('\n❌ TestMaster is EMPTY - No test types defined!');
    } else {
      console.log(`\n✅ TestMaster has ${testMaster} test types`);
    }
    
    if (testDef === 0) {
      console.log('❌ TestDefinition is EMPTY - No parameter definitions!');
    } else {
      console.log(`✅ TestDefinition has ${testDef} parameter definitions`);
    }
    
    if (testParam === 0) {
      console.log('⚠️  TestParameter is EMPTY - No parameters defined!');
    } else {
      console.log(`✅ TestParameter has ${testParam} parameters`);
    }
    
    if (labCenter === 0) {
      console.log('⚠️  LabCenter is EMPTY - Upload a report to auto-create!');
    } else {
      console.log(`✅ LabCenter has ${labCenter} records`);
      
      // Show lab centers
      const labs = await prisma.labCenter.findMany({ take: 5 });
      console.log('\n🏥 Lab Centers:');
      labs.forEach(lab => {
        console.log(`   - ${lab.centerName} (${lab.location || 'Unknown location'})`);
      });
    }
    
    // Show sample test masters
    if (testMaster > 0) {
      const masters = await prisma.testMaster.findMany({ 
        take: 5,
        include: { parameters: true }
      });
      console.log('\n📋 Test Masters (Sample):');
      masters.forEach(master => {
        console.log(`   - ${master.testName} (${master.parameters.length} parameters)`);
      });
    }
    
    // Check if auto-population is working
    if (reports > 0 && linkedResults === 0) {
      console.log('\n⚠️  WARNING: Reports exist but no master data linkage!');
      console.log('💡 Solution: Master data auto-population may not be working');
      console.log('   Try uploading a new report to test the feature');
    } else if (reports > 0 && linkedResults > 0) {
      console.log('\n✅ Master data auto-population is WORKING!');
      console.log(`   ${linkedResults} test results are properly linked`);
    }
    
    if (testMaster === 0 || testDef === 0) {
      console.log('\n💡 To populate master tables:');
      console.log('   1. Run: node populate_master_tables.js (for existing definitions)');
      console.log('   2. OR: Upload a new report (auto-population will create entries)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMasterTables();
