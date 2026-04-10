/**
 * Script to add sample test results to the database for testing
 * Usage: node add_sample_test_data.js <userId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleTestData(userId) {
  try {
    console.log('Starting to add sample test data...\n');

    // Sample test data with historical dates
    const testData = [
      {
        testType: 'Thyroid Test',
        reportDate: new Date('2025-11-15'),
        ocrText: 'Thyroid Function Test Results - November 2025',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'TSH',
            value: '2.3',
            unit: 'mIU/L',
            status: 'NORMAL',
            referenceRange: '0.5-5.0',
            normalMin: 0.5,
            normalMax: 5.0,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T3',
            value: '115',
            unit: 'ng/dL',
            status: 'NORMAL',
            referenceRange: '80-200',
            normalMin: 80,
            normalMax: 200,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T4',
            value: '8.5',
            unit: 'μg/dL',
            status: 'NORMAL',
            referenceRange: '5.0-12.0',
            normalMin: 5.0,
            normalMax: 12.0,
          },
        ],
      },
      {
        testType: 'Thyroid Test',
        reportDate: new Date('2025-12-20'),
        ocrText: 'Thyroid Function Test Results - December 2025',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'TSH',
            value: '2.8',
            unit: 'mIU/L',
            status: 'NORMAL',
            referenceRange: '0.5-5.0',
            normalMin: 0.5,
            normalMax: 5.0,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T3',
            value: '125',
            unit: 'ng/dL',
            status: 'NORMAL',
            referenceRange: '80-200',
            normalMin: 80,
            normalMax: 200,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T4',
            value: '9.2',
            unit: 'μg/dL',
            status: 'NORMAL',
            referenceRange: '5.0-12.0',
            normalMin: 5.0,
            normalMax: 12.0,
          },
        ],
      },
      {
        testType: 'Thyroid Test',
        reportDate: new Date('2026-01-29'),
        ocrText: 'Thyroid Function Test Results - January 2026',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'TSH',
            value: '2.5',
            unit: 'mIU/L',
            status: 'NORMAL',
            referenceRange: '0.5-5.0',
            normalMin: 0.5,
            normalMax: 5.0,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T3',
            value: '130',
            unit: 'ng/dL',
            status: 'NORMAL',
            referenceRange: '80-200',
            normalMin: 80,
            normalMax: 200,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Thyroid',
            testName: 'Thyroid Test',
            parameterName: 'T4',
            value: '9.8',
            unit: 'μg/dL',
            status: 'NORMAL',
            referenceRange: '5.0-12.0',
            normalMin: 5.0,
            normalMax: 12.0,
          },
        ],
      },
      {
        testType: 'Blood Sugar Test',
        reportDate: new Date('2025-10-10'),
        ocrText: 'Blood Glucose Test Results - October 2025',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'Fasting Glucose',
            value: '95',
            unit: 'mg/dL',
            status: 'NORMAL',
            referenceRange: '70-100',
            normalMin: 70,
            normalMax: 100,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'HbA1c',
            value: '5.6',
            unit: '%',
            status: 'NORMAL',
            referenceRange: '4.0-5.6',
            normalMin: 4.0,
            normalMax: 5.6,
          },
        ],
      },
      {
        testType: 'Blood Sugar Test',
        reportDate: new Date('2025-12-15'),
        ocrText: 'Blood Glucose Test Results - December 2025',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'Fasting Glucose',
            value: '105',
            unit: 'mg/dL',
            status: 'HIGH',
            referenceRange: '70-100',
            normalMin: 70,
            normalMax: 100,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'HbA1c',
            value: '5.8',
            unit: '%',
            status: 'HIGH',
            referenceRange: '4.0-5.6',
            normalMin: 4.0,
            normalMax: 5.6,
          },
        ],
      },
      {
        testType: 'Blood Sugar Test',
        reportDate: new Date('2026-02-01'),
        ocrText: 'Blood Glucose Test Results - February 2026',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'Fasting Glucose',
            value: '98',
            unit: 'mg/dL',
            status: 'NORMAL',
            referenceRange: '70-100',
            normalMin: 70,
            normalMax: 100,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'Glucose',
            testName: 'Blood Sugar Test',
            parameterName: 'HbA1c',
            value: '5.5',
            unit: '%',
            status: 'NORMAL',
            referenceRange: '4.0-5.6',
            normalMin: 4.0,
            normalMax: 5.6,
          },
        ],
      },
      {
        testType: 'Complete Blood Count',
        reportDate: new Date('2026-01-15'),
        ocrText: 'Complete Blood Count Results - January 2026',
        testResults: [
          {
            testCategory: 'Blood Test',
            testSubCategory: 'CBC',
            testName: 'Complete Blood Count',
            parameterName: 'Hemoglobin',
            value: '14.5',
            unit: 'g/dL',
            status: 'NORMAL',
            referenceRange: '13.5-17.5',
            normalMin: 13.5,
            normalMax: 17.5,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'CBC',
            testName: 'Complete Blood Count',
            parameterName: 'WBC',
            value: '7500',
            unit: '/μL',
            status: 'NORMAL',
            referenceRange: '4000-11000',
            normalMin: 4000,
            normalMax: 11000,
          },
          {
            testCategory: 'Blood Test',
            testSubCategory: 'CBC',
            testName: 'Complete Blood Count',
            parameterName: 'Platelets',
            value: '250000',
            unit: '/μL',
            status: 'NORMAL',
            referenceRange: '150000-400000',
            normalMin: 150000,
            normalMax: 400000,
          },
        ],
      },
    ];

    // Insert each test report
    for (const data of testData) {
      const { testType, reportDate, ocrText, testResults } = data;

      const report = await prisma.report.create({
        data: {
          userId,
          testType,
          reportDate,
          ocrText,
          testResults: {
            create: testResults.map((result) => ({
              ...result,
              testDate: reportDate,
            })),
          },
        },
        include: {
          testResults: true,
        },
      });

      console.log(`✓ Created report: ${testType} (${reportDate.toDateString()})`);
      console.log(`  - ${testResults.length} test results added`);

      // Create health summary
      const abnormalCount = testResults.filter(
        (r) => r.status !== 'NORMAL'
      ).length;
      const totalTests = testResults.length;
      const abnormalPercentage = (abnormalCount / totalTests) * 100;

      let overallStatus = 'NORMAL';
      let riskLevel = 'LOW';

      if (abnormalPercentage > 50) {
        overallStatus = 'CRITICAL';
        riskLevel = 'HIGH';
      } else if (abnormalPercentage > 20) {
        overallStatus = 'CAUTION';
        riskLevel = 'MEDIUM';
      }

      await prisma.healthSummary.create({
        data: {
          userId,
          reportId: report.id,
          summaryText: `Test Report Summary for ${testType}:\n- Total parameters tested: ${totalTests}\n- Abnormal results: ${abnormalCount}\n- Overall Status: ${overallStatus}`,
          overallStatus,
          abnormalCount,
          riskLevel,
        },
      });

      console.log(`  - Health summary created: ${overallStatus}\n`);
    }

    console.log('Sample test data added successfully!');
    console.log(`\nSummary:`);
    console.log(`- ${testData.length} reports created`);
    console.log(
      `- ${testData.reduce((sum, d) => sum + d.testResults.length, 0)} test results added`
    );
    console.log(`- ${testData.length} health summaries created`);
  } catch (error) {
    console.error('Error adding sample test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Error: userId is required');
  console.error('Usage: node add_sample_test_data.js <userId>');
  process.exit(1);
}

addSampleTestData(userId);
