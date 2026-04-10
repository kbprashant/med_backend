/**
 * Test CBC Column-Aware Extraction
 * 
 * Tests the new column-aware CBC extractor with the sample OCR from terminal
 */

const { extractCBCWithColumns } = require('./services/cbcColumnExtractor');

// Sample OCR text from terminal output
const sampleCBCOCR = `Flabs  |HelloOlabs.in
. +91 7253928905
$ https:/www.flabs.in/
Name  r Dunuy  Pallent ID
Age/Gender  20/Male  Report ID RE1
Relerred By  Self  Collection Dale 24/06/2023 0849 PM
Pisone No  Report Date 24/06/2023 09-02 PM
HAEMATOLOGY
cOMPLETE BLOOD COUNT (CBC)
TEST DESCRIPTION  RESULT  REF RANGE  LJNIT
Haemoglobıt
15  13 17  g/dL
Total Leucocyle Coun  5000  4000 10000
Differerntıal LeucOcyte Cou!
Neulsophis  50  40 g0
Lymphocyles  20. 40
Eosınoplds  1  16
Monocytes  2 10
Basophils  0.00  0 1
Absolute Leucocyte Count
Absolute Neutrophils  2500.00  2000 7O00  CUMIn
Absolute Lynphocytes  2000.00  1000 3O00  /CuIIm
Absolute Eosinophils  50.00  20- 500  Cumnn
Absolute Monocyles  450 00  200 1000  iCumm
RBC Indices
RBC Count  5  45 55  Mil
lion/curii
MCV  80.00  81- 101
MCH  30 00  27.32
MCHC  37.50  31.5 -34.5  g/dl
He  $0  40 50
RDW CV  12  11 6 14D
ROW SD  39. 46  fL
Platetets Indices
Platele Cou  300000  150000 410000  fc:umm
PCT  35
MPV  75.11 5  1L
PDW
Ieterpretation'`;

console.log('🧪 Testing CBC Column-Aware Extraction');
console.log('='.repeat(70));
console.log(`📄 OCR Text Length: ${sampleCBCOCR.length} characters\n`);

// Test extraction
const result = extractCBCWithColumns(sampleCBCOCR);

if (result && result.length > 0) {
  console.log('\n✅ Extraction Successful!');
  console.log(`📊 Total Parameters Extracted: ${result.length}\n`);
  
  console.log('📋 Extracted Parameters:');
  console.log('='.repeat(70));
  
  for (const param of result) {
    console.log(`${param.parameter.padEnd(30)} | ${String(param.value).padStart(10)} ${param.unit.padEnd(12)} | ${param.status.padEnd(10)} | Conf: ${(param.confidence * 100).toFixed(0)}%`);
  }
  
  console.log('='.repeat(70));
  
  // Check for expected parameters
  const expectedParams = [
    'Hemoglobin',
    'Total WBC Count',
    'Neutrophils',
    'Lymphocytes',
    'Eosinophils',
    'Monocytes',
    'Basophils',
    'Absolute Neutrophils',
    'Absolute Lymphocytes',
    'Absolute Eosinophils',
    'Absolute Monocytes',
    'RBC Count',
    'MCV',
    'MCH',
    'MCHC',
    'Hematocrit',
    'RDW-CV',
    'RDW-SD',
    'Platelet Count',
    'PCT',
    'MPV',
    'PDW'
  ];
  
  console.log('\n🔍 Expected Parameters Check:');
  const extractedNames = result.map(p => p.parameter);
  
  for (const expected of expectedParams) {
    const found = extractedNames.includes(expected);
    if (found) {
      console.log(`   ✅ ${expected}`);
    } else {
      console.log(`   ❌ ${expected} - NOT FOUND`);
    }
  }
  
  // Validate specific values
  console.log('\n🎯 Value Validation (based on OCR):');
  console.log('='.repeat(70));
  
  const validations = [
    { param: 'Hemoglobin', expectedValue: 15, expectedUnit: 'g/dL' },
    { param: 'Total WBC Count', expectedValue: 5000, expectedUnit: 'cells/cumm' },
    { param: 'Neutrophils', expectedValue: 50, expectedUnit: '%' },
    { param: 'Lymphocytes', expectedValue: 20, expectedUnit: '%' },
    { param: 'Eosinophils', expectedValue: 1, expectedUnit: '%' },
    { param: 'Monocytes', expectedValue: 2, expectedUnit: '%' },
    { param: 'Basophils', expectedValue: 0, expectedUnit: '%' },
    { param: 'Absolute Neutrophils', expectedValue: 2500, expectedUnit: 'cells/cumm' },
    { param: 'Absolute Lymphocytes', expectedValue: 2000, expectedUnit: 'cells/cumm' },
    { param: 'Absolute Eosinophils', expectedValue: 50, expectedUnit: 'cells/cumm' },
    { param: 'Absolute Monocytes', expectedValue: 450, expectedUnit: 'cells/cumm' },
    { param: 'RBC Count', expectedValue: 5, expectedUnit: 'mill/cumm' },
    { param: 'MCV', expectedValue: 80, expectedUnit: 'fL' },
    { param: 'MCH', expectedValue: 30, expectedUnit: 'pg' },
    { param: 'MCHC', expectedValue: 37.5, expectedUnit: 'g/dL' },
    { param: 'RDW-CV', expectedValue: 12, expectedUnit: '%' },
    { param: 'Platelet Count', expectedValue: 300000, expectedUnit: 'thou/cumm' }
  ];
  
  let correctValues = 0;
  let totalChecked = 0;
  
  for (const validation of validations) {
    const extracted = result.find(p => p.parameter === validation.param);
    
    if (extracted) {
      totalChecked++;
      const valueMatch = extracted.value === validation.expectedValue;
      
      if (valueMatch) {
        correctValues++;
        console.log(`   ✅ ${validation.param}: ${extracted.value} ${extracted.unit} (CORRECT)`);
      } else {
        console.log(`   ❌ ${validation.param}: ${extracted.value} ${extracted.unit} (Expected: ${validation.expectedValue})`);
      }
    } else {
      console.log(`   ⚠️  ${validation.param}: Not extracted`);
    }
  }
  
  console.log('='.repeat(70));
  console.log(`📊 Accuracy: ${correctValues}/${totalChecked} (${((correctValues/totalChecked)*100).toFixed(1)}%)`);
  
  // Check that reference range values were NOT extracted
  console.log('\n🚫 Reference Range Rejection Check:');
  console.log('   (Ensuring values from REF RANGE column were not extracted)');
  
  const incorrectExtractions = [];
  
  // Neutrophils should be 50 (not 40 or 80 from range "40 80")
  const neutrophils = result.find(p => p.parameter === 'Neutrophils');
  if (neutrophils && (neutrophils.value === 40 || neutrophils.value === 80)) {
    incorrectExtractions.push(`Neutrophils extracted from ref range: ${neutrophils.value}`);
  }
  
  // Hemoglobin should be 15 (not 13 or 17 from range "13 17")
  const hemoglobin = result.find(p => p.parameter === 'Hemoglobin');
  if (hemoglobin && (hemoglobin.value === 13 || hemoglobin.value === 17)) {
    incorrectExtractions.push(`Hemoglobin extracted from ref range: ${hemoglobin.value}`);
  }
  
  if (incorrectExtractions.length === 0) {
    console.log('   ✅ No reference range values incorrectly extracted!');
  } else {
    console.log('   ❌ Issues found:');
    for (const issue of incorrectExtractions) {
      console.log(`      - ${issue}`);
    }
  }
  
} else {
  console.log('\n❌ Extraction Failed');
  console.log('No parameters extracted from OCR text');
}

console.log('\n' + '='.repeat(70));
console.log('🏁 Test Complete\n');
