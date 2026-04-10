/**
 * Test Auto-Population of Master Tables
 * 
 * This script tests that master tables are populated automatically
 * when a report is uploaded
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { autoPopulateMasterTables } = require('./services/masterDataService');

async function testAutoPopulation() {
  try {
    console.log('🧪 Testing Auto-Population of Master Tables\n');
    console.log('='.repeat(70));

    // Sample OCR text with lab center information
    const sampleOcrText = `
      APOLLO DIAGNOSTICS
      Shop No. 123, MG Road, Bangalore - 560001
      Phone: 080-12345678
      Email: info@apollodiagnostics.com
      
      BLOOD TEST REPORT
      Patient Name: John Doe
      Date: 24-Feb-2026
      
      Complete Blood Count (CBC)
      
      Hemoglobin         14.5    g/dL    13.0-17.0
      RBC Count          4.8     mil/μL  4.5-5.5
      WBC Count          7200    /μL     4000-11000
      Platelet Count     250000  /μL     150000-400000
      Hematocrit         42.5    %       40-50
    `;

    // Sample extracted parameters
    const sampleParameters = [
      { parameter: 'Hemoglobin', value: '14.5', unit: 'g/dL', referenceRange: '13.0-17.0' },
      { parameter: 'RBC Count', value: '4.8', unit: 'mil/μL', referenceRange: '4.5-5.5' },
      { parameter: 'WBC Count', value: '7200', unit: '/μL', referenceRange: '4000-11000' },
      { parameter: 'Platelet Count', value: '250000', unit: '/μL', referenceRange: '150000-400000' },
      { parameter: 'Hematocrit', value: '42.5', unit: '%', referenceRange: '40-50' }
    ];

    // Report metadata
    const reportData = {
      testName: 'Complete Blood Count',
      category: 'Lab Reports',
      subcategory: 'Blood Tests'
    };

    console.log('📋 Test Data:');
    console.log(`   Report Type: ${reportData.testName}`);
    console.log(`   Category: ${reportData.category} > ${reportData.subcategory}`);
    console.log(`   Parameters: ${sampleParameters.length}`);
    console.log(`   OCR Text Length: ${sampleOcrText.length} chars\n`);

    // Count before
    console.log('📊 Database State BEFORE Auto-Population:');
    const beforeCounts = {
      labCenters: await prisma.labCenter.count(),
      testMasters: await prisma.testMaster.count(),
      testDefinitions: await prisma.testDefinition.count(),
      testParameters: await prisma.testParameter.count()
    };
    console.log(`   Lab Centers:      ${beforeCounts.labCenters}`);
    console.log(`   Test Masters:     ${beforeCounts.testMasters}`);
    console.log(`   Test Definitions: ${beforeCounts.testDefinitions}`);
    console.log(`   Test Parameters:  ${beforeCounts.testParameters}\n`);

    // Run auto-population
    const result = await autoPopulateMasterTables(reportData, sampleOcrText, sampleParameters);

    // Count after
    console.log('📊 Database State AFTER Auto-Population:');
    const afterCounts = {
      labCenters: await prisma.labCenter.count(),
      testMasters: await prisma.testMaster.count(),
      testDefinitions: await prisma.testDefinition.count(),
      testParameters: await prisma.testParameter.count()
    };
    console.log(`   Lab Centers:      ${afterCounts.labCenters} (+${afterCounts.labCenters - beforeCounts.labCenters})`);
    console.log(`   Test Masters:     ${afterCounts.testMasters} (+${afterCounts.testMasters - beforeCounts.testMasters})`);
    console.log(`   Test Definitions: ${afterCounts.testDefinitions} (+${afterCounts.testDefinitions - beforeCounts.testDefinitions})`);
    console.log(`   Test Parameters:  ${afterCounts.testParameters} (+${afterCounts.testParameters - beforeCounts.testParameters})\n`);

    // Verify results
    console.log('✅ Auto-Population Results:');
    console.log(`   Lab Center ID: ${result.labCenterId || 'Not created'}`);
    console.log(`   Test Master ID: ${result.testMasterId}`);
    console.log(`   Processed Parameters: ${result.processedParams.length}`);
    console.log(`   - With TestDefinition: ${result.processedParams.filter(p => p.testDefinitionId).length}`);
    console.log(`   - With TestParameter: ${result.processedParams.filter(p => p.testParameterId).length}\n`);

    // Display created lab center
    if (result.labCenterId) {
      const labCenter = await prisma.labCenter.findUnique({
        where: { id: result.labCenterId }
      });
      console.log('🏥 Created/Found Lab Center:');
      console.log(`   Name: ${labCenter.centerName}`);
      console.log(`   Location: ${labCenter.location}`);
      console.log(`   Phone: ${labCenter.phoneNumber || 'N/A'}`);
      console.log(`   Email: ${labCenter.email || 'N/A'}\n`);
    }

    // Display created test master
    const testMaster = await prisma.testMaster.findUnique({
      where: { id: result.testMasterId },
      include: { parameters: true }
    });
    console.log('📋 Created/Found Test Master:');
    console.log(`   Name: ${testMaster.testName}`);
    console.log(`   Category: ${testMaster.category} > ${testMaster.subcategory}`);
    console.log(`   Parameters: ${testMaster.parameters.length}\n`);

    // Display sample test definitions
    console.log('🧪 Test Definitions Created:');
    for (let i = 0; i < Math.min(3, result.processedParams.length); i++) {
      const param = result.processedParams[i];
      if (param.testDefinitionId) {
        const testDef = await prisma.testDefinition.findUnique({
          where: { id: param.testDefinitionId }
        });
        console.log(`   - ${testDef.parameterName} (${testDef.unit})`);
        console.log(`     Range: ${testDef.normalMinValue || 'N/A'} - ${testDef.normalMaxValue || 'N/A'}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n💡 Next Step: Upload a report through the app to see it in action!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoPopulation();
