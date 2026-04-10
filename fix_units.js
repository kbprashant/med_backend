/**
 * Fix incorrect units in test_results table
 * Run this to correct units that were extracted with OCR errors
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get correct unit based on parameter name
 */
function getCorrectUnit(parameterName) {
  const paramLower = parameterName.toLowerCase();
  
  // Blood sugar / glucose tests
  if (paramLower.includes('blood sugar') || 
      paramLower.includes('glucose') || 
      paramLower.includes('sugar') ||
      paramLower === 'fasting glucose' ||
      paramLower === 'postprandial glucose' ||
      paramLower === 'random glucose') {
    return 'mg/dl';
  }
  
  // Hemoglobin
  if (paramLower.includes('hemoglobin') || paramLower.includes('haemoglobin') || paramLower === 'hb') {
    return 'g/dl';
  }
  
  // Cholesterol and lipid tests
  if (paramLower.includes('cholesterol') || 
      paramLower.includes('triglyceride') || 
      paramLower.includes('ldl') || 
      paramLower.includes('hdl') || 
      paramLower.includes('vldl')) {
    return 'mg/dl';
  }
  
  // Kidney function tests
  if (paramLower.includes('creatinine') || paramLower.includes('urea') || paramLower.includes('bun')) {
    return 'mg/dl';
  }
  
  // Liver enzymes
  if (paramLower.includes('sgot') || paramLower.includes('sgpt') || 
      paramLower.includes('alt') || paramLower.includes('ast') ||
      paramLower.includes('alp') || paramLower.includes('ggt')) {
    return 'U/L';
  }
  
  // Bilirubin
  if (paramLower.includes('bilirubin')) {
    return 'mg/dl';
  }
  
  // Thyroid tests
  if (paramLower.includes('tsh')) {
    return 'mIU/L';
  }
  if (paramLower.includes('t3') || paramLower.includes('t4')) {
    return 'ng/dl';
  }
  
  // HbA1c
  if (paramLower.includes('hba1c') || paramLower.includes('a1c')) {
    return '%';
  }
  
  // Blood counts
  if (paramLower.includes('wbc') || paramLower.includes('rbc') || paramLower.includes('platelet')) {
    return 'cells/cumm';
  }
  
  // If no match, return null (no change)
  return null;
}

async function fixUnits() {
  try {
    console.log('🔧 Starting unit correction...\n');

    // Get all test results with suspicious units (OCR errors)
    const suspiciousUnits = ['&', 'GOD', 'POD', 'CHOD', 'PAP', 'GPT', 'GOT', 'METHOD'];
    
    const allResults = await prisma.testResult.findMany({
      where: {
        OR: [
          { unit: { in: suspiciousUnits } },
          { unit: null },
          { unit: '' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${allResults.length} test results with incorrect or missing units\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const result of allResults) {
      const correctUnit = getCorrectUnit(result.parameterName);
      
      if (correctUnit) {
        await prisma.testResult.update({
          where: { id: result.id },
          data: { unit: correctUnit }
        });
        
        console.log(`✅ Fixed: ${result.parameterName} (${result.testName})`);
        console.log(`   Old unit: "${result.unit || 'null'}" → New unit: "${correctUnit}"`);
        fixedCount++;
      } else {
        console.log(`⚠️  Skipped: ${result.parameterName} (no default unit defined)`);
        skippedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} records`);
    console.log(`   ⚠️  Skipped: ${skippedCount} records`);
    console.log(`\n🎉 Unit correction completed!`);

  } catch (error) {
    console.error('❌ Error fixing units:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixUnits();
