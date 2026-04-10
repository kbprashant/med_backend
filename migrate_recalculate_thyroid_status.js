/**
 * Migration Script: Recalculate Thyroid Test Statuses
 * 
 * Updates all existing thyroid test results to recalculate their status
 * using the newly updated reference ranges.
 * 
 * Run with: node migrate_recalculate_thyroid_status.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const referenceRanges = require('./services/referenceRanges');

async function recalculateThyroidStatuses() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 THYROID STATUS RECALCULATION MIGRATION');
  console.log('='.repeat(70));
  console.log('This will recalculate status for all thyroid test results');
  console.log('using the updated reference ranges:');
  console.log('  - FT3: 2.3-4.2 pg/mL');
  console.log('  - FT4: 0.8-1.8 ng/dL');
  console.log('  - TSH: 0.4-4.5 μIU/mL');
  console.log('  - T3 Total: 80-200 ng/dL');
  console.log('  - T4 Total: 5.0-12.0 μg/dL');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Find all thyroid test results
    console.log('📊 Step 1: Finding thyroid test results...');
    
    const thyroidParams = ['FT3', 'FT4', 'TSH', 'T3 Total', 'T4 Total'];
    
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

    // Step 2: Analyze current statuses
    console.log('📋 Step 2: Analyzing current statuses...\n');
    
    const updates = [];
    const statusChanges = {
      'NORMAL → NORMAL': 0,
      'NORMAL → HIGH': 0,
      'NORMAL → LOW': 0,
      'HIGH → NORMAL': 0,
      'HIGH → HIGH': 0,
      'LOW → NORMAL': 0,
      'LOW → LOW': 0,
      'LOW → HIGH': 0,
      'HIGH → LOW': 0
    };

    console.log('   Current vs New Status:');
    console.log('   ' + '-'.repeat(66));

    for (const result of allTestResults) {
      const oldStatus = result.status || 'NORMAL';
      const value = parseFloat(result.value);
      
      // Determine new status using updated reference ranges
      const newStatus = referenceRanges.determineStatus(
        result.parameterName,
        value,
        result.unit
      );

      // Map CRITICAL_* to HIGH/LOW for database compatibility
      const mappedNewStatus = newStatus === 'CRITICAL_HIGH' ? 'HIGH' : 
                              newStatus === 'CRITICAL_LOW' ? 'LOW' : 
                              newStatus;

      if (oldStatus !== mappedNewStatus) {
        updates.push({
          id: result.id,
          parameter: result.parameterName,
          value: result.value,
          unit: result.unit,
          date: result.testDate,
          oldStatus: oldStatus,
          newStatus: mappedNewStatus
        });

        const changeKey = `${oldStatus} → ${mappedNewStatus}`;
        statusChanges[changeKey] = (statusChanges[changeKey] || 0) + 1;
      }
    }

    // Step 3: Show what will change
    console.log(`\n   Status Changes Summary:`);
    console.log('   ' + '-'.repeat(66));
    for (const [change, count] of Object.entries(statusChanges)) {
      if (count > 0) {
        console.log(`   ${change}: ${count} results`);
      }
    }

    if (updates.length === 0) {
      console.log('\n✅ All statuses are already correct. No updates needed.');
      return;
    }

    console.log(`\n   Found ${updates.length} test results to update:`);
    console.log('   ' + '-'.repeat(66));
    updates.forEach((update, i) => {
      if (i < 15) { // Show first 15
        console.log(`   ${i + 1}. ${update.parameter}: ${update.value} ${update.unit}`);
        console.log(`      ${update.oldStatus} → ${update.newStatus} (${update.date.toLocaleDateString()})`);
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
        data: { status: update.newStatus }
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
        status: true,
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
        const statusEmoji = result.status === 'NORMAL' ? '✅' : 
                           result.status === 'HIGH' ? '⬆️' : '⬇️';
        console.log(`   ${statusEmoji} ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
      }
    });
    if (verifyResults.length > 15) {
      console.log(`   ... and ${verifyResults.length - 15} more`);
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total test results processed: ${allTestResults.length}`);
    console.log(`Test results updated: ${updateCount}`);
    console.log(`Test results unchanged: ${allTestResults.length - updateCount}`);
    console.log('\nStatus Distribution:');
    const statusCount = {
      NORMAL: 0,
      HIGH: 0,
      LOW: 0
    };
    verifyResults.forEach(r => {
      statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    });
    console.log(`  ✅ NORMAL: ${statusCount.NORMAL}`);
    console.log(`  ⬆️  HIGH: ${statusCount.HIGH}`);
    console.log(`  ⬇️  LOW: ${statusCount.LOW}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
recalculateThyroidStatuses()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
