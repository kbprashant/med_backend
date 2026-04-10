/**
 * Delete and Re-extract Blood Glucose Report
 * 
 * This script will:
 * 1. Find the latest blood glucose report
 * 2. Delete all incorrect test results
 * 3. Re-extract using the improved smartMedicalExtractor
 * 4. Save the correct values back to the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const smartMedicalExtractor = require('./services/smartMedicalExtractor');

async function reExtractBloodGlucoseReport() {
  try {
    console.log('🔄 Re-extracting Blood Glucose Report\n');
    
    // Step 1: Find the latest blood glucose report
    const report = await prisma.report.findFirst({
      where: {
        testType: 'Blood Glucose Test'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        testResults: true
      }
    });

    if (!report) {
      console.log('❌ No blood glucose report found');
      return;
    }

    console.log(`📄 Found report ID: ${report.id}`);
    console.log(`   Test Type: ${report.testType}`);
    console.log(`   Created: ${report.createdAt}`);
    console.log(`   Old test results: ${report.testResults.length}\n`);

    // Step 2: Delete old test results
    console.log('🗑️  Deleting old incorrect test results...');
    const deleteResult = await prisma.testResult.deleteMany({
      where: {
        reportId: report.id
      }
    });
    console.log(`✅ Deleted ${deleteResult.count} old test results\n`);

    // Step 3: Extract new values using improved extractor
    console.log('🔬 Extracting values using improved extractor...\n');
    const extractionResult = smartMedicalExtractor.extract(report.ocrText);

    if (!extractionResult.success || extractionResult.parameters.length === 0) {
      console.log(`❌ Extraction failed: ${extractionResult.message}`);
      return;
    }

    console.log(`✅ Extracted ${extractionResult.parameters.length} parameters\n`);

    // Step 4: Insert new test results
    console.log('💾 Saving new test results to database...\n');
    
    for (const param of extractionResult.parameters) {
      const testResult = await prisma.testResult.create({
        data: {
          reportId: report.id,
          testName: report.testType || 'Blood Glucose Test',
          parameterName: param.parameter,
          value: param.value.toString(),
          unit: param.unit || 'mg/dL',
          status: determineStatus(param.parameter, param.value),
          testCategory: report.testCategory || 'Lab Reports',
          testSubCategory: report.testSubCategory || 'Blood Tests',
          testDate: new Date(report.reportDate || report.createdAt)
        }
      });

      console.log(`✅ Saved: ${testResult.parameterName} = ${testResult.value} ${testResult.unit} [${testResult.status}]`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ RE-EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Report ID: ${report.id}`);
    console.log(`New test results: ${extractionResult.parameters.length}`);
    console.log('\nThe app should now show the correct blood glucose values!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function determineStatus(parameterName, value) {
  const numValue = parseFloat(value);
  
  // Glucose Fasting reference: 60-110 mg/dL
  if (/fasting/i.test(parameterName)) {
    if (numValue < 60) return 'LOW';
    if (numValue > 110) return 'HIGH';
    return 'NORMAL';
  }
  
  // Glucose PP reference: 90-140 mg/dL
  if (/pp|post.*prandial/i.test(parameterName)) {
    if (numValue < 90) return 'LOW';
    if (numValue > 140) return 'HIGH';
    return 'NORMAL';
  }
  
  return 'NORMAL';
}

reExtractBloodGlucoseReport();
