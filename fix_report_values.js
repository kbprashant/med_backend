const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to fix the existing Kidney Function Test report with correct values
 * Based on the PDF image showing actual test results
 */

async function fixReportValues() {
  try {
    console.log('🔧 Fixing Kidney Function Test Report Values...\n');

    // Find the most recent Kidney Function Test report
    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { testType: { contains: 'Kidney', mode: 'insensitive' } },
          { testType: { contains: 'KFT', mode: 'insensitive' } },
          { testType: { contains: 'RFT', mode: 'insensitive' } },
        ]
      },
      include: { testResults: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      console.log('❌ No Kidney Function Test report found');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found report ID: ${report.id}`);
    console.log(`   Test Type: ${report.testType}`);
    console.log(`   Created: ${report.createdAt}`);
    console.log(`   Current test results: ${report.testResults.length}\n`);

    // Define the correct test values from the PDF
    const testDate = report.reportDate || new Date();
    
    const correctTestResults = [
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'BUN',
        value: '10.27',
        unit: 'mg/dl',
        status: 'NORMAL',
        referenceRange: '7.9 - 20',
        normalMin: 7.9,
        normalMax: 20.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Blood Urea',
        value: '22',
        unit: 'mg/dl',
        status: 'NORMAL',
        referenceRange: '21 - 43',
        normalMin: 21.0,
        normalMax: 43.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Creatinine',
        value: '1.01',
        unit: 'mg/dl',
        status: 'NORMAL',
        referenceRange: '0.55 - 1.02',
        normalMin: 0.55,
        normalMax: 1.02,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'eGFR',
        value: '50.32',
        unit: 'ml/min/1.73m^2',
        status: 'LOW',
        referenceRange: '> 90',
        normalMin: 90.0,
        normalMax: 200.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'EGFR Category',
        value: 'G3a',
        unit: '',
        status: 'ABNORMAL',
        referenceRange: 'G1 (Normal)',
        normalMin: null,
        normalMax: null,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Calcium',
        value: '9.2',
        unit: 'mg/dl',
        status: 'NORMAL',
        referenceRange: '8.8 - 10.6',
        normalMin: 8.8,
        normalMax: 10.6,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Potassium',
        value: '3.6',
        unit: 'mmol/L',
        status: 'NORMAL',
        referenceRange: '3.5 - 5.1',
        normalMin: 3.5,
        normalMax: 5.1,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Sodium',
        value: '138',
        unit: 'mmol/L',
        status: 'NORMAL',
        referenceRange: '136 - 146',
        normalMin: 136.0,
        normalMax: 146.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Uric Acid',
        value: '4',
        unit: 'mg/dl',
        status: 'NORMAL',
        referenceRange: '2.6 - 6',
        normalMin: 2.6,
        normalMax: 6.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'Urea/Creatinine Ratio',
        value: '21.78',
        unit: '',
        status: 'HIGH',
        referenceRange: '10 - 20',
        normalMin: 10.0,
        normalMax: 20.0,
        testDate: testDate,
      },
      {
        testName: 'Kidney Function Test (KFT/RFT)',
        testCategory: 'Kidney Function Test (KFT/RFT)',
        testSubCategory: 'Renal',
        parameterName: 'BUN/Creatinine Ratio',
        value: '10.17',
        unit: '',
        status: 'NORMAL',
        referenceRange: '10 - 20',
        normalMin: 10.0,
        normalMax: 20.0,
        testDate: testDate,
      },
    ];

    // Delete existing test results
    if (report.testResults.length > 0) {
      await prisma.testResult.deleteMany({
        where: { reportId: report.id },
      });
      console.log(`🗑️  Deleted ${report.testResults.length} old test results\n`);
    }

    // Create new test results with correct values
    console.log('📊 Creating correct test results...\n');
    for (const testResult of correctTestResults) {
      await prisma.testResult.create({
        data: {
          reportId: report.id,
          ...testResult,
        },
      });
      console.log(`✅ ${testResult.parameterName}: ${testResult.value} ${testResult.unit} [${testResult.status}]`);
    }

    console.log(`\n✅ Successfully fixed ${correctTestResults.length} test results!`);
    
    // Update health summary (optional - skip if fails)
    console.log('\n📈 Attempting to update health summary...');
    
    try {
      const userId = report.userId;
      const abnormalResults = correctTestResults.filter(r => r.status !== 'NORMAL');
      
      // Find existing health summary
      let healthSummary = await prisma.healthSummary.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (healthSummary) {
        await prisma.healthSummary.update({
          where: { id: healthSummary.id },
          data: {
            overallStatus: abnormalResults.length > 0 ? 'Needs Attention' : 'Normal',
            abnormalParametersCount: abnormalResults.length,
            lastUpdated: new Date(),
          },
        });
        console.log('✅ Health summary updated');
      } else {
        console.log('⚠️  No existing health summary found, skipping creation');
      }
    } catch (error) {
      console.log('⚠️  Could not update health summary (not critical):', error.message);
    }

    console.log('\n🎉 Report fix completed successfully!');
    console.log('💡 Hot reload your Flutter app (press "r" in terminal) to see the updated values\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error fixing report:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixReportValues();
