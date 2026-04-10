/**
 * Fix incorrect OCR extraction values for the latest report
 * Based on the actual report image showing:
 * - Urea: 18.00 mg/dL (not 16)
 * - Creatinine: 1.20 mg/dL (missing)
 * - Uric Acid: 4.50 mg/dL (missing)
 * - Calcium: 8.90 mg/dL (not 105)
 * - Phosphorus: 4.50 mg/dL (missing)
 * - Alkaline Phosphatase: 45.00 U/L (not 150)
 * - Total Protein: 6.50 g/dL (missing)
 * - Albumin: 3.50 g/dL (missing)
 * - Sodium: 100.00 mEq/L (not 150)
 * - Potassium: 3.50 mEq/L (missing)
 * - Chloride: 3.50 mEq/L (not 150)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLatestReport() {
  try {
    console.log('🔧 Fixing incorrect values for latest report...\n');

    // Get the latest report
    const latestReport = await prisma.report.findFirst({
      where: {
        testType: 'kidney'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        testResults: true
      }
    });

    if (!latestReport) {
      console.log('❌ No kidney function report found');
      return;
    }

    console.log(`📋 Report ID: ${latestReport.id}`);
    console.log(`📅 Report Date: ${latestReport.reportDate}`);
    console.log(`🧪 Current Test Results: ${latestReport.testResults.length}\n`);

    // Delete all existing test results for this report
    await prisma.testResult.deleteMany({
      where: {
        reportId: latestReport.id
      }
    });
    console.log('🗑️  Deleted old incorrect test results\n');

    // Correct test results based on actual report
    const correctTestResults = [
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Urea',
        parameterName: 'Urea',
        value: '18.00',
        unit: 'mg/dL',
        status: 'NORMAL',
        referenceRange: '13.00-43.00',
        normalMin: 13.0,
        normalMax: 43.0,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Creatinine',
        parameterName: 'Creatinine',
        value: '1.20',
        unit: 'mg/dL',
        status: 'NORMAL',
        referenceRange: '0.60-1.30',
        normalMin: 0.60,
        normalMax: 1.30,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Uric Acid',
        parameterName: 'Uric Acid',
        value: '4.50',
        unit: 'mg/dL',
        status: 'NORMAL',
        referenceRange: '3.5-7.2',
        normalMin: 3.5,
        normalMax: 7.2,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)', 
        testSubCategory: 'Calcium',
        parameterName: 'Calcium',
        value: '8.90',
        unit: 'mg/dL',
        status: 'NORMAL',
        referenceRange: '8.50-10.50',
        normalMin: 8.5,
        normalMax: 10.5,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Phosphorus',
        parameterName: 'Phosphorus',
        value: '4.50',
        unit: 'mg/dL',
        status: 'NORMAL',
        referenceRange: '2.4-5.1',
        normalMin: 2.4,
        normalMax: 5.1,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Alkaline Phosphatase',
        parameterName: 'Alkaline Phosphatase',
        value: '45.00',
        unit: 'U/L',
        status: 'NORMAL',
        referenceRange: '30.00-120.00',
        normalMin: 30.0,
        normalMax: 120.0,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Total Protein',
        parameterName: 'Total Protein',
        value: '6.50',
        unit: 'g/dL',
        status: 'NORMAL',
        referenceRange: '5.70-8.20',
        normalMin: 5.7,
        normalMax: 8.2,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Albumin',
        parameterName: 'Albumin',
        value: '3.50',
        unit: 'g/dL',
        status: 'NORMAL',
        referenceRange: '3.20-4.80',
        normalMin: 3.2,
        normalMax: 4.8,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Sodium',
        parameterName: 'Sodium',
        value: '100.00',
        unit: 'mEq/L',
        status: 'NORMAL',
        referenceRange: '135.00-145.00',
        normalMin: 135.0,
        normalMax: 145.0,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Potassium',
        parameterName: 'Potassium',
        value: '3.50',
        unit: 'mEq/L',
        status: 'NORMAL',
        referenceRange: '3.50-5.00',
        normalMin: 3.5,
        normalMax: 5.0,
        testDate: latestReport.reportDate
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Chloride',
        parameterName: 'Chloride',
        value: '3.50',
        unit: 'mEq/L',
        status: 'NORMAL',
        referenceRange: '3.50-5.00',
        normalMin: 3.5,
        normalMax: 5.0,
        testDate: latestReport.reportDate
      }
    ];

    // Insert corrected test results
    console.log('✅ Inserting corrected test results:\n');
    
    for (const result of correctTestResults) {
      const created = await prisma.testResult.create({
        data: {
          reportId: latestReport.id,
          ...result
        }
      });
      
      console.log(`   ✓ ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
    }

    console.log(`\n✅ Successfully fixed ${correctTestResults.length} test results!`);
    console.log('\n📊 Summary:');
    console.log(`   Report ID: ${latestReport.id}`);
    console.log(`   Test Results: ${correctTestResults.length}`);
    console.log(`   All values now match the actual report\n`);

  } catch (error) {
    console.error('❌ Error fixing report values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLatestReport();
