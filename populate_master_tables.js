const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * AUTO-POPULATE TEST_MASTER AND TEST_PARAMETERS TABLES
 * 
 * This script automatically extracts data from test_definitions 
 * and populates the legacy test_master and test_parameters tables.
 * 
 * Purpose: Maintain backward compatibility with old schema
 */

(async () => {
  try {
    console.log('🔄 AUTO-POPULATING MASTER TABLES FROM TEST_DEFINITIONS...\n');

    // Step 1: Get all test definitions
    const testDefinitions = await prisma.testDefinition.findMany({
      orderBy: [
        { categoryName: 'asc' },
        { testName: 'asc' }
      ]
    });

    if (testDefinitions.length === 0) {
      console.log('❌ No test definitions found. Please run seed_test_definitions.js first!');
      return;
    }

    console.log(`📊 Found ${testDefinitions.length} test definitions\n`);

    // Step 2: Group by test type (category + subcategory)
    const testGroups = {};
    
    testDefinitions.forEach(def => {
      // Use categoryName as the test type (e.g., "Kidney Function Test (KFT/RFT)")
      const testType = def.categoryName;
      const category = def.categoryName.includes('Test') ? 'Lab Reports' : 'Lab Reports';
      const subcategory = testType;

      if (!testGroups[testType]) {
        testGroups[testType] = {
          testName: testType,
          category: category,
          subcategory: subcategory,
          parameters: []
        };
      }

      // Add parameter to this test group
      testGroups[testType].parameters.push({
        parameterName: def.parameterName,
        unit: def.unit,
        normalMin: def.normalMinValue,
        normalMax: def.normalMaxValue,
        testDefinitionId: def.id,
        genderSpecific: def.genderSpecific
      });
    });

    console.log(`🗂️  Organized into ${Object.keys(testGroups).length} test groups\n`);

    // Step 3: Clear existing data (optional - comment out to preserve)
    console.log('🗑️  Clearing existing test_master and test_parameters...');
    await prisma.testParameter.deleteMany({});
    await prisma.testMaster.deleteMany({});
    console.log('✅ Cleared old data\n');

    // Step 4: Insert into test_master and test_parameters
    let masterCount = 0;
    let paramCount = 0;

    console.log('📝 Creating test_master entries and their parameters...\n');

    for (const [testType, testData] of Object.entries(testGroups)) {
      // Create TestMaster entry
      const testMaster = await prisma.testMaster.create({
        data: {
          testName: testData.testName,
          category: testData.category,
          subcategory: testData.subcategory,
          description: `Auto-generated from TestDefinition. Contains ${testData.parameters.length} parameters.`
        }
      });

      masterCount++;
      console.log(`✅ Created TestMaster: ${testData.testName} (${testData.parameters.length} params)`);

      // Create TestParameter entries for this test
      for (const param of testData.parameters) {
        await prisma.testParameter.create({
          data: {
            testId: testMaster.id,
            parameterName: param.parameterName,
            unit: param.unit || 'N/A',
            normalMin: param.normalMin,
            normalMax: param.normalMax
          }
        });
        paramCount++;
      }
    }

    console.log('\n============================================================');
    console.log('✅ AUTO-POPULATION COMPLETE!');
    console.log('============================================================');
    console.log(`📊 TestMaster entries created:     ${masterCount}`);
    console.log(`📋 TestParameter entries created:  ${paramCount}`);
    console.log('============================================================\n');

    // Step 5: Verify the data
    console.log('🔍 VERIFICATION:\n');
    
    const masters = await prisma.testMaster.findMany({
      include: {
        parameters: true
      },
      take: 5
    });

    masters.forEach(master => {
      console.log(`📌 ${master.testName}`);
      console.log(`   Category: ${master.category} > ${master.subcategory}`);
      console.log(`   Parameters: ${master.parameters.length}`);
      master.parameters.slice(0, 3).forEach(p => {
        const range = p.normalMin && p.normalMax ? 
          `${p.normalMin}-${p.normalMax} ${p.unit}` : 
          'N/A';
        console.log(`      - ${p.parameterName}: ${range}`);
      });
      console.log('');
    });

    // Final count
    const finalMasterCount = await prisma.testMaster.count();
    const finalParamCount = await prisma.testParameter.count();
    
    console.log('============================================================');
    console.log('📊 FINAL DATABASE STATE:');
    console.log('============================================================');
    console.log(`TestDefinition:  ${testDefinitions.length} records ✅`);
    console.log(`TestMaster:      ${finalMasterCount} records ✅`);
    console.log(`TestParameter:   ${finalParamCount} records ✅`);
    console.log('============================================================\n');

    console.log('🎉 All master tables are now populated automatically!');
    console.log('💡 Future uploads will now be able to link to both systems.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nStack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
