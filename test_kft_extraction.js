/**
 * Test KFT extraction with actual OCR text from user's report
 */

const smartExtractor = require('./services/smartMedicalExtractor');

const ocrText = `FOTFSIUF
EiRI64E
FELL
- ~
Aster | abs Ea
O2 1-k-
THE TRUE TEST
TEST REPORT
Lab. Id : P0217108 Hosp. UHID : Reg. Date : 14-May-2021 7 12.07 PM sm
Name : MS SUMALATHA K PATIL Collection ! 14.May.2021 * 12.06 PM ==
Age Gender 1 30Y Female Received 1 14-May-2021 12:39 PM ==
Collected At: . Report L 14-May-2021 + 12:57 PM
Referral Or : Print . _-—
Biochemistry
Investigation Observed Value Unit Biological Ref. Interval Specimen
KIDNEY FUNCTION TEST
UREA 8.4 mg dl 128-428 Serum
CREATININE 0.60 mg-dl 06-12 Serum
NT) Fro ymin
URIC ACID 3.6 mg-dl 24-57 Serum
AR) UnLase
TOTAL PROTEIN 7.3 gdb 64-83 Serum
Ward Bred
ALBUMIN 4.0 g/dL 35-52 Serum
Wes BOG
GLOBULIN 3.3 gdL 23-35 Serum
AT) Caa31e0
A'G RATIO 1.21 1-2 Serum
Ae?) Cabana
ALKALINE PHOSPHATASE 88.0 UL 40 - 130 Serum
20d FOC
CALCIUM 88 mg): dl 86-10.2 Serum
BT) BASTA
PHOSPHORUS 3.8
SODIUM 135.0 mmol l 137-145 Serum
POTASSIUM 4.1 mmol | 35-53 Serum
TG BL
CHLORIDE 105.0 mmol 98-107 Serum
NYT) rset (Gf
Comments:
Kidneys play several vital roles like filiraton'remova`;

console.log('='.repeat(70));
console.log('TESTING KFT EXTRACTION');
console.log('='.repeat(70));
console.log('\nOCR Text:');
console.log(ocrText);
console.log('\n' + '='.repeat(70));

const result = smartExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('EXTRACTION RESULTS');
console.log('='.repeat(70));

if (result.success) {
  console.log('PASS: Extraction successful!');
  console.log('Parameters extracted: ' + result.parameters.length);
  console.log('\nExtracted Parameters:');
  
  result.parameters.forEach((param, idx) => {
    console.log('\n' + (idx + 1) + '. ' + param.parameter);
    console.log('   Value: ' + param.value);
    console.log('   Unit: ' + (param.unit || 'N/A'));
    console.log('   Status: ' + (param.status || 'N/A'));
  });
  
  // Validate expected results
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION');
  console.log('='.repeat(70));
  
  const expectedParams = [
    'UREA', 'Creatinine', 'Uric Acid', 
    'Total Protein', 'Albumin', 'Globulin', 'A/G Ratio',
    'Alkaline Phosphatase', 'Calcium', 'Phosphorus',
    'Sodium', 'Potassium', 'Chloride'
  ];
  const foundParams = result.parameters.map(p => p.parameter);
  
  expectedParams.forEach(expected => {
    const found = result.parameters.find(p => 
      p.parameter.toLowerCase().includes(expected.toLowerCase().split(' ')[0]) ||
      p.parameter.toLowerCase().replace(/[\/':]/g, '') === expected.toLowerCase().replace(/[\/':]/g, '')
    );
    if (found) {
      console.log('PASS: ' + expected.padEnd(25) + ': ' + found.value + ' ' + (found.unit || '(unitless)'));
    } else {
      console.log('FAIL: ' + expected.padEnd(25) + ': NOT FOUND');
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(70));
  const missing = expectedParams.filter(exp => 
    !foundParams.some(f => 
      f.toLowerCase().includes(exp.toLowerCase().split(' ')[0]) ||
      f.toLowerCase().replace(/[\/':]/g, '') === exp.toLowerCase().replace(/[\/':]/g, '')
    )
  );
  
  if (missing.length === 0) {
    console.log('SUCCESS: ALL ' + expectedParams.length + ' EXPECTED PARAMETERS FOUND!');
  } else {
    console.log('WARNING: MISSING ' + missing.length + ' PARAMETER(S): ' + missing.join(', '));
  }
  
} else {
  console.log('FAIL: Extraction failed: ' + result.message);
}

console.log('='.repeat(70));
