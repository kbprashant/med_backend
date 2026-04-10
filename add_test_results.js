const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Adding Test Results to Existing Thyroid Reports ===\n');
    
    // Get all thyroid reports
    const thyroidReports = await prisma.report.findMany({
      where: {
        testType: 'thyroid'
      },
      orderBy: {
        reportDate: 'asc'
      }
    });

    console.log(`Found ${thyroidReports.length} thyroid reports`);

    // Add test results to each report
    for (let i = 0; i < thyroidReports.length; i++) {
      const report = thyroidReports[i];
      const reportDate = new Date(report.reportDate);
      
      // Vary the values slightly for each report to show trends
      const tshValue = (2.5 + (i * 0.5)).toFixed(2);
      const t3Value = (100 + (i * 10)).toString();
      const t4Value = (7.0 + (i * 0.5)).toFixed(2);
      
      const testResults = [
        {
          reportId: report.id,
          testCategory: 'Thyroid Test',
          testSubCategory: 'TSH',
          testName: 'thyroid',  // Match the report testType
          parameterName: 'TSH',
          value: tshValue,
          unit: 'μIU/mL',
          status: parseFloat(tshValue) < 0.5 || parseFloat(tshValue) > 5.0 ? 'ABNORMAL' : 'NORMAL',
          referenceRange: '0.5-5.0 μIU/mL',
          normalMin: 0.5,
          normalMax: 5.0,
          testDate: reportDate,
        },
        {
          reportId: report.id,
          testCategory: 'Thyroid Test',
          testSubCategory: 'T3',
          testName: 'thyroid',
          parameterName: 'T3',
          value: t3Value,
          unit: 'ng/dL',
          status: parseInt(t3Value) < 80 || parseInt(t3Value) > 200 ? 'ABNORMAL' : 'NORMAL',
          referenceRange: '80-200 ng/dL',
          normalMin: 80,
          normalMax: 200,
          testDate: reportDate,
        },
        {
          reportId: report.id,
          testCategory: 'Thyroid Test',
          testSubCategory: 'T4',
          testName: 'thyroid',
          parameterName: 'T4',
          value: t4Value,
          unit: 'μg/dL',
          status: parseFloat(t4Value) < 5.0 || parseFloat(t4Value) > 12.0 ? 'ABNORMAL' : 'NORMAL',
          referenceRange: '5.0-12.0 μg/dL',
          normalMin: 5.0,
          normalMax: 12.0,
          testDate: reportDate,
        },
      ];

      await prisma.testResult.createMany({
        data: testResults,
      });

      console.log(`✓ Added ${testResults.length} test results to report from ${reportDate.toLocaleDateString()}`);
    }

    console.log('\n=== Success! ===');
    console.log('All thyroid reports now have test results.');
    console.log('You should now see test history in the app!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
