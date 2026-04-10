/**
 * Recalculate Status for Existing Reports
 * 
 * This script updates the status of all existing test results
 * using the new universal status evaluator.
 * 
 * Run this ONCE after deploying the status evaluation fix
 * to correct statuses for all historical reports.
 */

const { PrismaClient } = require('@prisma/client');
const { evaluateParameterStatus } = require('./utils/statusEvaluator');
const testDefinitionService = require('./services/testDefinitionService');

const prisma = new PrismaClient();

async function recalculateAllStatuses() {
  console.log('🔄 Recalculating Status for All Existing Reports\n');
  console.log('='.repeat(70));

  try {
    // Fetch all test results
    const allTestResults = await prisma.testResult.findMany({
      select: {
        id: true,
        parameterName: true,
        value: true,
        unit: true,
        status: true,
        referenceRange: true,
      }
    });

    console.log(`\n📊 Found ${allTestResults.length} test results to process\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    // Process each test result
    for (const testResult of allTestResults) {
      try {
        const param = {
          parameter: testResult.parameterName,
          value: testResult.value,
          unit: testResult.unit,
          referenceRange: testResult.referenceRange
        };

        // If no reference range, try to look it up from master data
        if (!param.referenceRange || param.referenceRange.trim() === '') {
          const testDef = testDefinitionService.findByTestName(testResult.parameterName);
          if (testDef) {
            if (testDef.is_qualitative) {
              param.referenceRange = testDef.risk_level_logic.normal;
            } else if (testDef.normal_min_value !== null && testDef.normal_max_value !== null) {
              param.referenceRange = `${testDef.normal_min_value}-${testDef.normal_max_value}`;
            }
          }
        }

        // Evaluate new status
        const newStatus = evaluateParameterStatus(param);
        const oldStatus = testResult.status;

        // Update if changed
        if (newStatus !== oldStatus) {
          await prisma.testResult.update({
            where: { id: testResult.id },
            data: { 
              status: newStatus,
              referenceRange: param.referenceRange || testResult.referenceRange
            }
          });

          console.log(`✅ Updated: ${testResult.parameterName}`);
          console.log(`   Old: ${oldStatus} → New: ${newStatus}`);
          console.log(`   Value: ${testResult.value} ${testResult.unit}`);
          console.log(`   Reference: ${param.referenceRange || '(none)'}\n`);
          
          updated++;
        } else {
          unchanged++;
        }
      } catch (error) {
        console.error(`❌ Error processing test result ${testResult.id}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 Recalculation Summary');
    console.log('='.repeat(70));
    console.log(`Total Processed: ${allTestResults.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`→ Unchanged: ${unchanged}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70));

    if (updated > 0) {
      console.log(`\n🎉 Successfully updated ${updated} test results with correct statuses!`);
      
      // Update health summaries for affected reports
      console.log('\n🔄 Regenerating health summaries for affected reports...');
      const affectedReports = await prisma.testResult.findMany({
        select: { reportId: true },
        distinct: ['reportId']
      });

      console.log(`   Found ${affectedReports.length} unique reports`);
      console.log('   ℹ️  Run regenerate_summaries.js to update health summaries\n');
    } else {
      console.log('\n✅ All statuses are already correct. No updates needed.\n');
    }

  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
recalculateAllStatuses()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
