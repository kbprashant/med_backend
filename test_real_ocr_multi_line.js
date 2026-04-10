/**
 * Test URINE extraction with REAL OCR text from Flutter app
 * This is the exact OCR that only extracted 9/13 parameters
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

// EXACT OCR text from Flutter log (the one that only got 9 parameters)
const realOcrText = `4CRL
Toll Free No. 1800-313-7878
Diagnostics
EADIH E WAY PROHSSAONAY  Laberatory Test Report
Se ofPticnt Mrs. VIBHA (:PTA  Tt Requt I) : 863louN7
AgeiDder  Speun Jrawy))N |L.0;1-i2||05:4N}
:MAHABIRLB  Specincn Reccivel ON: |L4;-20242:3|PAE
Reiered RY  Repot [A: 13.0-2023(4(00PA{
Smph Tvpr Irin. B1494h3
Refst(u
CLINICALPATHOLOGY
Biological Aeference
Test Name  Resull  Method
Range
URINE EXAMINATION ROUTINE
Gross Examination(Physical Exarnination)
Volume  20.
Colour  YELLOW  PALE YELLOW
Appearance  SLIGHTLY TURBID  CLEAR
Chemical Examination
Ph  6.C  4.6-8.0 Double lndicators Tesi
Specific Gravity  1.020  1.005-1.030 Retractome:ric
Urine Protein.  NEGATIVE  NEGATIVE Protern Error of Indcaos
Urine Glucose-
++  NEGATIVE Oxidase Peroxıdase Reacton
Ketone  NEGATIVE  NEGATIVE Sodıum NRSoprusice
NItrite  NEGATIVE  NEGATIVE Diazolısatıon Reacthon
Blood  NEGATIVE  NEGATIVE Peroxıdase React:on
Urobilinogen  NORMAL  NORMAL blodt:ed Ehrlich
Urine BIirubin  Reackon
NEGATIVE  NEGATIVE D:azolısaticn
Leukocyle  NEGATIV`;

console.log('========================================');
console.log('🧪 TESTING REAL OCR FROM FLUTTER APP');
console.log('========================================\n');

console.log('📋 OCR Text Issues:');
console.log('   - "Urine Protein." has trailing dot');
console.log('   - "Urine Glucose-" value "++" on next line');
console.log('   - "Urine BIirubin" misspelled, value 2 lines below');
console.log('   - "Leukocyle" misspelled as Leukocyle (not Leukocyte)');
console.log('   - "NItrite" has capital I in middle\n');

const result = extractWithStrictValidation(realOcrText);

console.log('\n========================================');
console.log('📊 TEST RESULTS');
console.log('========================================\n');

console.log(`Report Type: ${result.reportType === 'URINE_ROUTINE' ? '✅' : '❌'} ${result.reportType}`);
console.log(`Parameters Extracted: ${result.parameters.length}/13\n`);

// Expected parameters
const expectedParams = [
  'Volume', 'Colour', 'Appearance', 'pH', 'Specific Gravity',
  'Urine Protein', 'Urine Glucose', 'Ketone', 'Nitrite', 'Blood',
  'Urobilinogen', 'Bilirubin', 'Leukocyte'
];

// Check which parameters we got
const extractedNames = result.parameters.map(p => p.parameter);
const missing = expectedParams.filter(p => !extractedNames.includes(p));

console.log('✅ Extracted Parameters:');
result.parameters.forEach(p => {
  console.log(`   ${p.parameter}: ${p.value} ${p.unit || ''} ${p.referenceRange ? `(Ref: ${p.referenceRange})` : ''}`);
});

if (missing.length > 0) {
  console.log(`\n❌ Missing Parameters (${missing.length}):`);
  missing.forEach(p => console.log(`   - ${p}`));
}

console.log('\n========================================');
console.log('🎯 KEY FIXES TESTED:');
console.log('========================================');
console.log(`✓ Trailing punctuation handling: ${extractedNames.includes('Urine Protein') ? '✅ YES' : '❌ NO'}`);
console.log(`✓ Multi-line value extraction: ${extractedNames.includes('Urine Glucose') ? '✅ YES' : '❌ NO'}`);
console.log(`✓ OCR misspelling correction (BIirubin): ${extractedNames.includes('Bilirubin') ? '✅ YES' : '❌ NO'}`);
console.log(`✓ OCR misspelling correction (Leukocyle): ${extractedNames.includes('Leukocyte') ? '✅ YES' : '❌ NO'}`);
console.log(`✓ OCR misspelling correction (NItrite): ${extractedNames.includes('Nitrite') ? '✅ YES' : '❌ NO'}`);
console.log('========================================\n');

// Final verdict
if (result.parameters.length === 13 && missing.length === 0) {
  console.log('🎉 SUCCESS! All 13 parameters extracted correctly!\n');
} else {
  console.log(`⚠️  INCOMPLETE: Got ${result.parameters.length}/13 parameters\n`);
}
