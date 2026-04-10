/**
 * Migration Script: Normalize Thyroid Parameters
 * 
 * Updates all existing thyroid test results in the database to use normalized parameter names.
 * This is a one-time migration to fix data created before the normalization system was implemented.
 * 
 * Run with: node migrate_normalize_thyroid.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { normalizeThyroidParameter } = require('./services/normalizer');

async function migrateThyroidParameters() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 THYROID PARAMETER NORMALIZATION MIGRATION');
  console.log('='.repeat(70));
  console.log('This will update all existing thyroid test results to use normalized names');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Find all test results with thyroid-related parameter names
    console.log('📊 Step 1: Finding thyroid test results...');
    
    const thyroidKeywords = [
      'T3', 'T4', 'TSH', 
      'Triidothyronine', 'Triiodothyronine', 'Triidothyroninc',  // OCR typos
      'Thyroxine', 'Thyroid'
    ];
    
    const allTestResults = await prisma.testResult.findMany({
      where: {
        OR: thyroidKeywords.map(keyword => ({
          parameterName: {
            contains: keyword,
            mode: 'insensitive'
          }
        }))
      },
      orderBy: {
        testDate: 'desc'
      }
    });

    console.log(`   Found ${allTestResults.length} thyroid test results\n`);

    if (allTestResults.length === 0) {
      console.log('✅ No thyroid test results found. Migration not needed.');
      return;
    }

    // Step 2: Group by parameter name to show what will change
    console.log('📋 Step 2: Analyzing parameter names...\n');
    
    const parameterCounts = new Map();
    const normalizedMap = new Map();
    
    for (const result of allTestResults) {
      const original = result.parameterName;
      const normalized = normalizeThyroidParameter(original);
      
      parameterCounts.set(original, (parameterCounts.get(original) || 0) + 1);
      normalizedMap.set(original, normalized);
    }

    console.log('   Current Parameter Names → Normalized Names:');
    console.log('   ' + '-'.repeat(66));
    
    for (const [original, count] of parameterCounts.entries()) {
      const normalized = normalizedMap.get(original);
      const arrow = original === normalized ? '→ (no change)' : `→ ${normalized}`;
      console.log(`   "${original}" (${count} results) ${arrow}`);
    }

    // Step 3: Update all test results
    console.log('\n🔄 Step 3: Updating test results...\n');
    
    let updateCount = 0;
    let noChangeCount = 0;
    const updates = [];

    for (const result of allTestResults) {
      const original = result.parameterName;
      const normalized = normalizeThyroidParameter(original);
      
      if (original !== normalized) {
        updates.push({
          id: result.id,
          original: original,
          normalized: normalized,
          value: result.value,
          date: result.testDate
        });
        updateCount++;
      } else {
        noChangeCount++;
      }
    }

    // Show updates to be made
    if (updates.length > 0) {
      console.log(`   Found ${updates.length} test results to update:`);
      updates.forEach((update, i) => {
        if (i < 10) { // Show first 10
          console.log(`   ${i + 1}. "${update.original}" → "${update.normalized}" (${update.value}, ${update.date.toLocaleDateString()})`);
        }
      });
      if (updates.length > 10) {
        console.log(`   ... and ${updates.length - 10} more`);
      }
    }

    // Ask for confirmation (in production, you might want to use readline for interactive confirmation)
    console.log('\n⚠️  WARNING: This will update the database!');
    console.log(`   Updates to make: ${updateCount}`);
    console.log(`   No change needed: ${noChangeCount}`);
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Execute updates
    console.log('🚀 Step 4: Executing updates...\n');
    
    for (const update of updates) {
      await prisma.testResult.update({
        where: { id: update.id },
        data: { parameterName: update.normalized }
      });
    }

    console.log(`   ✅ Updated ${updateCount} test results`);

    // Step 5: Verify results
    console.log('\n🔍 Step 5: Verifying updates...\n');
    
    const verifyResults = await prisma.testResult.findMany({
      where: {
        OR: thyroidKeywords.map(keyword => ({
          parameterName: {
            contains: keyword,
            mode: 'insensitive'
          }
        }))
      },
      distinct: ['parameterName']
    });

    console.log('   Unique parameter names after migration:');
    const uniqueNames = [...new Set(verifyResults.map(r => r.parameterName))].sort();
    uniqueNames.forEach(name => {
      console.log(`   - ${name}`);
    });

    // Step 6: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total test results processed: ${allTestResults.length}`);
    console.log(`Test results updated: ${updateCount}`);
    console.log(`Test results unchanged: ${noChangeCount}`);
    console.log(`Unique parameter names now: ${uniqueNames.length}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateThyroidParameters()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
