/**
 * Link existing test results to TestDefinition master data
 * This script updates testDefinitionId for all test results
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping of parameter names to test IDs
const PARAMETER_TO_TEST_ID = {
  // Kidney Function Tests
  'Urea': 'KFT002',
  'Blood Urea': 'KFT002',
  'Creatinine': 'KFT001',
  'Serum Creatinine': 'KFT001',
  'BUN': 'KFT003',
  'Blood Urea Nitrogen': 'KFT003',
  'Uric Acid': 'KFT004',
  'Sodium': 'KFT005',
  'Potassium': 'KFT006',
  'Chloride': 'KFT007',
  'Calcium': 'VT002',
  'Phosphorus': 'VT003',
  'Magnesium': 'VT004',
  
  // Liver Function Tests
  'Alkaline Phosphatase': 'LFT005',
  'ALP': 'LFT005',
  'SGPT (ALT)': 'LFT003',
  'ALT': 'LFT003',
  'SGOT (AST)': 'LFT004',
  'AST': 'LFT004',
  'Bilirubin': 'LFT001',
  'Bilirubin (Total)': 'LFT001',
  'Bilirubin Total': 'LFT001',
  'Bilirubin (Direct)': 'LFT002',
  'Bilirubin Direct': 'LFT002',
  'Albumin': 'LFT006',
  'Globulin': 'LFT007',
  'Total Protein': 'LFT006', // Using Albumin as closest match
  
  // Blood Tests
  'Hemoglobin': 'BT001',
  'HB': 'BT001',
  'RBC': 'BT002',
  'RBC Count': 'BT002',
  'WBC': 'BT003',
  'WBC Count': 'BT003',
  'Platelet': 'BT004',
  'Platelet Count': 'BT004',
  'Hematocrit': 'BT005',
  'HCT': 'BT005',
  'MCV': 'BT006',
  'MCH': 'BT007',
  'MCHC': 'BT008',
  'ESR': 'BT009',
  
  // Thyroid Tests
  'TSH': 'HT001',
  'T3': 'HT002',
  'T4': 'HT003',
  'Free T3': 'HT002',
  'Free T4': 'HT003',
  
  // Lipid Profile
  'Total Cholesterol': 'CT001',
  'Cholesterol': 'CT001',
  'HDL': 'CT002',
  'HDL Cholesterol': 'CT002',
  'LDL': 'CT003',
  'LDL Cholesterol': 'CT003',
  'VLDL': 'CT004',
  'VLDL Cholesterol': 'CT004',
  'Triglycerides': 'CT005',
  
  // Vitamins
  'Vitamin D': 'VT001',
  'Vitamin B12': 'NT001',
  
  // Other common tests
  'CRP': 'IT001',
  'PSA': 'CAN001',
};

async function linkTestResults() {
  try {
    console.log('🔗 Linking test results to master data...\n');
    
    // Get all test definitions for verification
    const testDefinitions = await prisma.testDefinition.findMany();
    const testDefMap = {};
    testDefinitions.forEach(td => {
      testDefMap[td.testId] = td.id;
    });
    
    console.log(`📊 Found ${testDefinitions.length} test definitions in database\n`);
    
    // Get all test results that need linking
    const testResults = await prisma.testResult.findMany({
      where: {
        testDefinitionId: null
      }
    });
    
    console.log(`📋 Found ${testResults.length} test results to link\n`);
    
    let linked = 0;
    let notFound = 0;
    const notFoundParams = new Set();
    
    for (const result of testResults) {
      const paramName = result.parameterName.trim();
      const testId = PARAMETER_TO_TEST_ID[paramName];
      
      if (testId && testDefMap[testId]) {
        // Update the test result with testDefinitionId
        await prisma.testResult.update({
          where: { id: result.id },
          data: { testDefinitionId: testDefMap[testId] }
        });
        
        console.log(`   ✅ Linked: ${paramName} → ${testId}`);
        linked++;
      } else {
        console.log(`   ⚠️  No mapping: ${paramName}`);
        notFoundParams.add(paramName);
        notFound++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Linking Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully linked:  ${linked} test results`);
    console.log(`⚠️  Not found:          ${notFound} test results`);
    console.log(`📝 Total processed:     ${testResults.length} test results`);
    console.log('='.repeat(60));
    
    if (notFoundParams.size > 0) {
      console.log('\n⚠️  Parameters without mapping:');
      notFoundParams.forEach(param => {
        console.log(`   - ${param}`);
      });
      console.log('\n💡 Add these parameters to PARAMETER_TO_TEST_ID mapping');
    }
    
  } catch (error) {
    console.error('❌ Error linking test results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkTestResults();
