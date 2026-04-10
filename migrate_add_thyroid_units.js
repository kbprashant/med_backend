/**
 * Migration Script: Add Missing Units to Thyroid Tests
 * 
 * Adds the correct standard units to thyroid test results that are missing units.
 * 
 * Standard Units:
 * - FT3: pg/mL
 * - FT4: ng/dL
 * - TSH: μIU/mL
 * - T3 Total: ng/dL
 * - T4 Total: μg/dL
 * 
 * Run with: node migrate_add_thyroid_units.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Standard units for thyroid parameters (from reference ranges)
const THYROID_STANDARD_UNITS = {
  'FT3': 'pg/mL',
  'FT4': 'ng/dL',
  'TSH': 'μIU/mL',
  'T3 Total': 'ng/dL',
  'T4 Total': 'μg/dL'
};

async function addMissingThyroidUnits() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 ADD MISSING UNITS TO THYROID TESTS MIGRATION');
  console.log('='.repeat(70));
  console.log('This will add standard units to thyroid test results');
  console.log('Standard Units:');
  console.log('  - FT3: pg/mL');
  console.log('  - FT4: ng/dL');
  console.log('  - TSH: μIU/mL');
  console.log('  - T3 Total: ng/dL');
  console.log('  - T4 Total: μg/dL');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Find all thyroid test results
    console.log('📊 Step 1: Finding thyroid test results...');
    
    const thyroidParams = Object.keys(THYROID_STANDARD_UNITS);
    
    const allTestResults = await prisma.testResult.findMany({
      where: {
        OR: thyroidParams.map(param => ({
          parameterName: param
        }))
      },
      orderBy: [
        { testDate: 'desc' },
        { parameterName: 'asc' }
      ]
    });

    console.log(`   Found ${allTestResults.length} thyroid test results\n`);

    if (allTestResults.length === 0) {
      console.log('✅ No thyroid test results found. Migration not needed.');
      return;
    }

    // Step 2: Analyze current units
    console.log('📋 Step 2: Analyzing units...\n');
    
    const updates = [];
    let missingCount = 0;
    let incompleteCount = 0;
    let correctCount = 0;

    for (const result of allTestResults) {
      const currentUnit = result.unit || '';
      const standardUnit = THYROID_STANDARD_UNITS[result.parameterName];
      
      if (!currentUnit || currentUnit.trim() === '') {
        // Missing unit
        updates.push({
          id: result.id,
          parameter: result.parameterName,
          value: result.value,
          date: result.testDate,
          oldUnit: '(empty)',
          newUnit: standardUnit
        });
        missingCount++;
      } else if (currentUnit !== standardUnit && standardUnit.includes(currentUnit)) {
        // Incomplete unit (e.g., "pg" instead of "pg/mL")
        updates.push({
          id: result.id,
          parameter: result.parameterName,
          value: result.value,
          date: result.testDate,
          oldUnit: currentUnit,
          newUnit: standardUnit
        });
        incompleteCount++;
      } else if (currentUnit === standardUnit) {
        correctCount++;
      }
    }

    console.log('   Unit Status:');
    console.log('   ' + '-'.repeat(66));
    console.log(`   ✅ Correct units: ${correctCount}`);
    console.log(`   ⚠️  Incomplete units: ${incompleteCount}`);
    console.log(`   ❌ Missing units: ${missingCount}`);
    console.log(`   📝 Total to update: ${updates.length}`);

    if (updates.length === 0) {
      console.log('\n✅ All units are already correct. No updates needed.');
      return;
    }

    // Step 3: Show what will change
    console.log(`\n   Updates to be made:`);
    console.log('   ' + '-'.repeat(66));
    updates.forEach((update, i) => {
      if (i < 15) { // Show first 15
        console.log(`   ${i + 1}. ${update.parameter}: ${update.value}`);
        console.log(`      ${update.oldUnit} → ${update.newUnit} (${update.date.toLocaleDateString()})`);
      }
    });
    if (updates.length > 15) {
      console.log(`   ... and ${updates.length - 15} more`);
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will update the database!');
    console.log(`   Updates to make: ${updates.length}`);
    console.log(`   No change needed: ${allTestResults.length - updates.length}`);
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Execute updates
    console.log('🚀 Step 4: Executing updates...\n');
    
    let updateCount = 0;
    for (const update of updates) {
      await prisma.testResult.update({
        where: { id: update.id },
        data: { unit: update.newUnit }
      });
      updateCount++;
    }

    console.log(`   ✅ Updated ${updateCount} test results`);

    // Step 5: Verify results
    console.log('\n🔍 Step 5: Verifying updates...\n');
    
    const verifyResults = await prisma.testResult.findMany({
      where: {
        OR: thyroidParams.map(param => ({
          parameterName: param
        }))
      },
      select: {
        parameterName: true,
        value: true,
        unit: true,
        testDate: true
      },
      orderBy: [
        { testDate: 'desc' },
        { parameterName: 'asc' }
      ]
    });

    console.log('   Updated Test Results:');
    console.log('   ' + '-'.repeat(66));
    verifyResults.forEach((result, i) => {
      if (i < 15) {
        console.log(`   ✅ ${result.parameterName}: ${result.value} ${result.unit}`);
      }
    });
    if (verifyResults.length > 15) {
      console.log(`   ... and ${verifyResults.length - 15} more`);
    }

    // Check for any remaining missing units
    const stillMissing = verifyResults.filter(r => !r.unit || r.unit.trim() === '');
    if (stillMissing.length > 0) {
      console.log('\n⚠️  WARNING: Some results still have missing units:');
      stillMissing.forEach(r => {
        console.log(`   - ${r.parameterName}: ${r.value}`);
      });
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total test results processed: ${allTestResults.length}`);
    console.log(`Test results updated: ${updateCount}`);
    console.log(`Test results unchanged: ${allTestResults.length - updateCount}`);
    console.log('\nAll thyroid test results now have proper units:');
    for (const [param, unit] of Object.entries(THYROID_STANDARD_UNITS)) {
      const count = verifyResults.filter(r => r.parameterName === param).length;
      console.log(`  - ${param}: ${unit} (${count} results)`);
    }
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
addMissingThyroidUnits()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
