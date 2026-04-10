/**
 * Fix all incorrect units in test_results table
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllUnits() {
  try {
    console.log('🔧 Starting comprehensive unit correction...\n');

    // Define correct unit mappings
    const corrections = [
      // Fix OCR errors and wrong units
      { from: 'UIL', to: 'U/L', like: false },
      { from: 'BD', to: 'g/dL', like: false },
      { from: 'NG/DL', to: 'mg/dL', like: false },
      { from: 'ANG/DL', to: 'mg/dL', like: false },
      { from: 'GOD', to: 'mg/dL', like: false },
      { from: '&', to: 'mg/dL', like: false },
      { from: 'POD', to: 'mg/dL', like: false },
      { from: 'CHOD', to: 'mg/dL', like: false },
      { from: 'METHOD', to: 'mg/dL', like: false },
    ];

    let totalFixed = 0;

    for (const correction of corrections) {
      const results = await prisma.testResult.updateMany({
        where: {
          unit: correction.from
        },
        data: {
          unit: correction.to
        }
      });

      if (results.count > 0) {
        console.log(`✅ Fixed ${results.count} records: "${correction.from}" → "${correction.to}"`);
        totalFixed += results.count;
      }
    }

    // Fix empty units for specific parameters
    const parameterUnits = {
      'Fasting Glucose': 'mg/dL',
      'Postprandial Glucose': 'mg/dL',
      'Random Glucose': 'mg/dL',
      'Blood Sugar': 'mg/dL',
      'Glucose': 'mg/dL',
      
      'Hemoglobin': 'g/dL',
      'Hb': 'g/dL',
      
      'AST (SGOT)': 'U/L',
      'ALT (SGPT)': 'U/L',
      'AST/ALT Ratio': '',
      'Alkaline Phosphatase (ALP)': 'U/L',
      'GGTP': 'U/L',
      'GGT': 'U/L',
      
      'Bilirubin Total': 'mg/dL',
      'Bilirubin Direct': 'mg/dL',
      'Bilirubin Indirect': 'mg/dL',
      
      'Total Protein': 'g/dL',
      'Albumin': 'g/dL',
      'Globulin': 'g/dL',
      'A/G Ratio': '',
      
      'Total Cholesterol': 'mg/dL',
      'LDL Cholesterol': 'mg/dL',
      'HDL Cholesterol': 'mg/dL',
      'Triglycerides': 'mg/dL',
      'VLDL Cholesterol': 'mg/dL',
      
      'Creatinine': 'mg/dL',
      'Blood Urea': 'mg/dL',
      'BUN': 'mg/dL',
      'Uric Acid': 'mg/dL',
    };

    console.log('\n📝 Fixing empty units for known parameters...\n');

    for (const [param, unit] of Object.entries(parameterUnits)) {
      const results = await prisma.testResult.updateMany({
        where: {
          parameterName: param,
          OR: [
            { unit: null },
            { unit: '' }
          ]
        },
        data: {
          unit: unit
        }
      });

      if (results.count > 0) {
        console.log(`✅ Fixed ${results.count} empty units for "${param}" → "${unit}"`);
        totalFixed += results.count;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${totalFixed} records\n`);
    console.log('🎉 Unit correction completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllUnits();
