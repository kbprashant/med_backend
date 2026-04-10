/**
 * Seed Script for Master Test Definitions
 * Run: node prisma/seed_test_definitions.js
 */

const { PrismaClient } = require('@prisma/client');
const testData = require('./master_test_data.json');

const prisma = new PrismaClient();

async function seedTestDefinitions() {
  console.log('🌱 Starting seed process...');
  console.log(`📊 Total tests to seed: ${testData.test_definitions.length} tests`);
  
  try {
    // Clear existing test definitions (optional - comment out if you want to preserve existing data)
    console.log('🗑️  Clearing existing test definitions...');
    await prisma.testDefinition.deleteMany({});
    
    let successCount = 0;
    let errorCount = 0;
    
    // Insert each test definition
    for (const test of testData.test_definitions) {
      try {
        await prisma.testDefinition.create({
          data: {
            testId: test.test_id,
            categoryName: test.category_name,
            testName: test.test_name,
            parameterName: test.parameter_name,
            unit: test.unit || '',
            normalMinValue: test.normal_min_value,
            normalMaxValue: test.normal_max_value,
            riskLevelLogic: JSON.stringify(test.risk_level_logic),
            isQualitative: test.is_qualitative || false,
            genderSpecific: test.gender_specific ? JSON.stringify(test.gender_specific) : null,
          }
        });
        successCount++;
        console.log(`✅ Inserted: ${test.test_id} - ${test.test_name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error inserting ${test.test_id}:`, error.message);
      }
    }
    
    console.log('\n📈 Seed Summary:');
    console.log(`   ✅ Successfully inserted: ${successCount} tests`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${testData.test_definitions.length} tests`);
    
    // Display category breakdown
    const categories = [...new Set(testData.test_definitions.map(t => t.category_name))];
    console.log('\n📁 Categories seeded:');
    for (const category of categories) {
      const count = testData.test_definitions.filter(t => t.category_name === category).length;
      console.log(`   ${category}: ${count} tests`);
    }
    
    console.log('\n🎉 Seed process completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTestDefinitions()
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
