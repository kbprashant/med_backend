/**
 * Validate extraction accuracy against actual OCR values
 */

const reportProcessingService = require('./services/reportProcessingService');

// OCR from terminal output
const terminalCBCOCR = `Flabs  |HelloOlabs.in
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

// Expected values from manual OCR reading
const expectedValues = {
  'Hemoglobin': { value: 15, unit: 'g/dL' },
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
  'RDW-CV': { value: 12, unit: '%' },
  'RDW-SD': { value: 39, unit: 'fL' },
  'Platelet Count': { value: 300000, unit: 'thou/cumm' },
  'PCT': { value: 35, unit: '%' },
  'MPV': { value: 7.5, unit: 'fL' }, // OCR shows "75.11 5" but should be 7.5 based on ref range 6.5-11
};

async function validateExtraction() {
  console.log('🔍 VALIDATING EXTRACTION ACCURACY\n');
  
  const result = await reportProcessingService.runSmartExtraction(terminalCBCOCR);
  
  let correct = 0;
  let wrong = [];
  let missing = [];
  
  for (const [paramName, expected] of Object.entries(expectedValues)) {
    const extracted = result.parameters.find(p => {
      const name = p.parameter || p.displayName || '';
      return name.toLowerCase().includes(paramName.toLowerCase()) || 
             paramName.toLowerCase().includes(name.toLowerCase());
    });
    
    if (!extracted) {
      missing.push(paramName);
      console.log(`❌ ${paramName}: NOT FOUND`);
      continue;
    }
    
    const extractedValue = parseFloat(extracted.value);
    const expectedValue = parseFloat(expected.value);
    const extractedUnit = extracted.unit;
    const expectedUnit = expected.unit;
    
    const valueMatch = Math.abs(extractedValue - expectedValue) < 0.01;
    const unitMatch = extractedUnit === expectedUnit;
    
    if (valueMatch && unitMatch) {
      correct++;
      console.log(`✅ ${paramName}: ${extracted.value} ${extractedUnit}`);
    } else {
      wrong.push({
        param: paramName,
        extracted: `${extracted.value} ${extractedUnit}`,
        expected: `${expected.value} ${expectedUnit}`,
        valueMatch,
        unitMatch
      });
      console.log(`❌ ${paramName}:`);
      console.log(`   Extracted: ${extracted.value} ${extractedUnit}`);
      console.log(`   Expected:  ${expected.value} ${expectedUnit}`);
      if (!valueMatch) console.log(`   ⚠️  VALUE MISMATCH`);
      if (!unitMatch) console.log(`   ⚠️  UNIT MISMATCH`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 Summary: ${correct} correct, ${wrong.length} wrong, ${missing.length} missing`);
  console.log(`   Total expected: ${Object.keys(expectedValues).length}`);
  console.log(`   Total extracted: ${result.parameters.length}`);
  
  if (wrong.length > 0) {
    console.log('\n🔴 WRONG VALUES:');
    wrong.forEach(w => {
      console.log(`   ${w.param}: ${w.extracted} (expected ${w.expected})`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n⚠️  MISSING PARAMETERS:');
    missing.forEach(m => console.log(`   ${m}`));
  }
  
  if (wrong.length === 0 && missing.length === 0) {
    console.log('\n✅ ALL VALUES AND UNITS ARE CORRECT!');
  }
}

validateExtraction().catch(console.error);
