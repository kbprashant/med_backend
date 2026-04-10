/**
 * Check what values were extracted from the latest report
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestReport() {
  try {
    // Get the latest CBC report
    const latestReport = await prisma.report.findFirst({
      where: {
        testType: 'Complete Blood Count'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        testResults: {
          orderBy: {
            parameterName: 'asc'
          }
        }
      }
    });

    if (!latestReport) {
      console.log('❌ No CBC report found');
      return;
    }

    console.log('\n📋 Latest CBC Report Analysis');
    console.log('='.repeat(90));
    console.log(`Report ID: ${latestReport.id}`);
    console.log(`Report Date: ${latestReport.reportDate}`);
    console.log(`Test Results Count: ${latestReport.testResults.length}`);
    console.log('='.repeat(90));
    console.log('\n📊 Extracted Values vs Expected Values:\n');
    console.log('Parameter'.padEnd(30) + 'Extracted'.padEnd(15) + 'Unit'.padEnd(15) + 'Expected'.padEnd(15) + 'Status');
    console.log('-'.repeat(90));

    // Expected values based on OCR
    const expectedValues = {
      'Hemoglobin': { value: 15, unit: 'g/dL' },
      'WBC Count': { value: 5000, unit: 'cells/cumm' },
      'Total WBC Count': { value: 5000, unit: 'cells/cumm' },
      'Neutrophils': { value: 50, unit: '%' },
      'Lymphocytes': { value: 20, unit: '%' },
      'Eosinophils': { value: 1, unit: '%' },
      'Monocytes': { value: 2, unit: '%' },
      'Basophils': { value: 0, unit: '%' },
      'Absolute Neutrophils': { value: 2500, unit: 'cells/cumm' },
      'Absolute Lymphocytes': { value: 2000, unit: 'cells/cumm' },
      'Absolute Eosinophils': { value: 50, unit: 'cells/cumm' },
      'Absolute Monocytes': { value: 450, unit: 'cells/cumm' },
      'RBC Count': { value: 5, unit: 'mill/cumm' },
      'MCV': { value: 80, unit: 'fL' },
      'MCH': { value: 30, unit: 'pg' },
      'MCHC': { value: 37.5, unit: 'g/dL' },
      'RDW': { value: 12, unit: '%' },
      'RDW-CV': { value: 12, unit: '%' },
      'RDW-SD': { value: 39, unit: 'fL' },
      'Platelet Count': { value: 300000, unit: 'thou/cumm' },
      'PCT': { value: 35, unit: '%' },
      'MPV': { value: 75.11, unit: 'fL' }
    };

    let correctCount = 0;
    let wrongCount = 0;
    let wrongValues = [];

    for (const result of latestReport.testResults) {
      const paramName = result.parameterName;
      const extractedValue = result.value;
      const extractedUnit = result.unit;
      
      const expected = expectedValues[paramName];
      
      if (expected) {
        const valueMatch = Math.abs(extractedValue - expected.value) < 0.01;
        const status = valueMatch ? '✅ CORRECT' : '❌ WRONG';
        
        console.log(
          paramName.substring(0, 29).padEnd(30) +
          String(extractedValue).padEnd(15) +
          extractedUnit.padEnd(15) +
          String(expected.value).padEnd(15) +
          status
        );
        
        if (valueMatch) {
          correctCount++;
        } else {
          wrongCount++;
          wrongValues.push({
            parameter: paramName,
            extracted: extractedValue,
            expected: expected.value,
            unit: extractedUnit
          });
        }
      } else {
        console.log(
          paramName.substring(0, 29).padEnd(30) +
          String(extractedValue).padEnd(15) +
          extractedUnit.padEnd(15) +
          'N/A'.padEnd(15) +
          '⚠️  NO REFERENCE'
        );
      }
    }

    console.log('-'.repeat(90));
    console.log(`\n📊 Summary: ${correctCount} correct, ${wrongCount} wrong out of ${latestReport.testResults.length} parameters`);
    
    if (wrongValues.length > 0) {
      console.log('\n❌ INCORRECT VALUES FOUND:');
      console.log('='.repeat(90));
      for (const wrong of wrongValues) {
        console.log(`\n🔴 ${wrong.parameter}:`);
        console.log(`   Extracted: ${wrong.extracted} ${wrong.unit}`);
        console.log(`   Expected:  ${wrong.expected} ${wrong.unit}`);
        console.log(`   Difference: ${Math.abs(wrong.extracted - wrong.expected)}`);
      }
    } else {
      console.log('\n✅ ALL VALUES ARE CORRECT!');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkLatestReport();
