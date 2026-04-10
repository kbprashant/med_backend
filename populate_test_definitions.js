/**
 * Populate Test Definitions Table
 * This script populates the test_definitions table with master test data
 * Run this after creating/migrating the database schema
 */

const prisma = require('./config/database');
const fs = require('fs');
const path = require('path');

async function populateTestDefinitions() {
  try {
    console.log('📚 Starting Test Definitions Population...\n');

    // Check if test definitions already exist
    const existingCount = await prisma.testDefinition.count();
    console.log(`Current test definitions in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log('\n⚠️  Test definitions already exist!');
      console.log('Options:');
      console.log('  1. Skip population (safe)');
      console.log('  2. Clear and re-populate (WARNING: Will delete existing data)');
      console.log('\nTo clear and re-populate, set FORCE_REPOPULATE=true in environment');
      
      if (process.env.FORCE_REPOPULATE !== 'true') {
        console.log('\n✅ Skipping population (existing data preserved)');
        return;
      }

      console.log('\n🗑️  Clearing existing test definitions...');
      await prisma.testDefinition.deleteMany({});
      console.log('✅ Cleared successfully');
    }

    // Load master_test_data.json
    const jsonPath = path.join(__dirname, 'prisma', 'master_test_data.json');
    console.log(`\n📖 Reading from: ${jsonPath}`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error('master_test_data.json not found!');
    }

    const masterData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const testDefinitions = masterData.test_definitions;

    console.log(`\n📊 Found ${testDefinitions.length} test definitions to insert\n`);

    // Insert in batches
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < testDefinitions.length; i += BATCH_SIZE) {
      const batch = testDefinitions.slice(i, i + BATCH_SIZE);
      
      const data = batch.map(test => ({
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
      }));

      await prisma.testDefinition.createMany({ data });
      
      insertedCount += batch.length;
      console.log(`✅ Inserted ${insertedCount}/${testDefinitions.length} definitions...`);
    }

    console.log(`\n🎉 Successfully populated ${insertedCount} test definitions!`);

    // Show summary by category
    const categories = await prisma.testDefinition.groupBy({
      by: ['categoryName'],
      _count: {
        categoryName: true,
      },
      orderBy: {
        categoryName: 'asc',
      },
    });

    console.log('\n📋 Summary by Category:');
    console.log('═══════════════════════════════════════════════════════════');
    categories.forEach(cat => {
      console.log(`   ${cat.categoryName.padEnd(35)} ${cat._count.categoryName} tests`);
    });
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   TOTAL${' '.repeat(35 - 5)} ${insertedCount} tests\n`);

  } catch (error) {
    console.error('❌ Error populating test definitions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  populateTestDefinitions()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { populateTestDefinitions };
