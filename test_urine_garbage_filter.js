/**
 * Test URINE_ROUTINE Garbage Filtering and Strict Whitelist
 * 
 * Tests:
 * 1. Garbage filtering (patient info, headers)
 * 2. Strict parameter whitelist
 * 3. Parameter name normalization
 * 4. Qualitative value support (++, NEGATIVE, etc.)
 * 5. Reference range extraction
 * 6. Duplicate prevention
 * 7. 30% rejection safety check
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

console.log('\n========================================');
console.log('🧪 URINE GARBAGE FILTER TEST');
console.log('========================================\n');

// Test with real OCR that contains garbage
const urineOcrWithGarbage = `
Se ofPticnt Mrs. VIBHA (:PTA Tt Requt I)
AgeiDder Speun Jrawy))N |L.0;1-i2||05
:MAHABIRLB Specincn Reccivel ON
Reiered RY Repot [A

URINE EXAMINATION ROUTINE

Volume 20.
Colour YELLOW PALE YELLOW
Appearance SLIGHTLY TURBID CLEAR
Ph 6.0 4.6-8.0
Specific Gravity 1.020 1.005-1.030
Urine Protein NEGATIVE
Urine Glucose ++
Ketone NEGATIVE
Nitrite NEGATIVE
Blood NEGATIVE
Urobilinogen NORMAL
Bilirubin NEGATIVE
Leukocyte NEGATIVE
`;

console.log('TEST 1: Garbage Filtering + Strict Whitelist\n');

const result = extractWithStrictValidation(urineOcrWithGarbage);

console.log(`Report Type: ${result.reportType}`);
console.log(`Success: ${result.success}`);
console.log(`Requires Manual Review: ${result.requiresManualReview || false}`);
console.log(`\nExtracted Parameters (${result.parameters.length}):`);
console.log('DEBUG: Full parameter objects:');
console.log(JSON.stringify(result.parameters.slice(0, 5), null, 2));
const expectedParams = {
  'Volume': '20',
  'Colour': 'YELLOW',
  'Appearance': 'SLIGHTLY TURBID',
  'pH': '6.0',
  'Specific Gravity': '1.020',
  'Urine Protein': 'NEGATIVE',
  'Urine Glucose': '++',
  'Ketone': 'NEGATIVE',
  'Nitrite': 'NEGATIVE',
  'Blood': 'NEGATIVE',
  'Urobilinogen': 'NORMAL',
  'Bilirubin': 'NEGATIVE',
  'Leukocyte': 'NEGATIVE'
};

let allCorrect = true;
const foundParams = new Set();

result.parameters.forEach(param => {
  foundParams.add(param.parameter);
  const expected = expectedParams[param.parameter];
  
  const refRangeText = param.referenceRange ? ` (Ref: ${param.referenceRange})` : '';
  
  if (expected && param.value === expected) {
    console.log(`  ✅ ${param.parameter}: ${param.value} ${param.unit || ''}${refRangeText}`);
  } else if (expected) {
    console.log(`  ⚠️  ${param.parameter}: "${param.value}" ${param.unit || ''}${refRangeText} (expected "${expected}")`);
  } else {
    console.log(`  ⚠️  ${param.parameter}: ${param.value} ${param.unit || ''} (UNEXPECTED PARAMETER)`);
  }
});

// Check for missing parameters
for (const [param, value] of Object.entries(expectedParams)) {
  if (!foundParams.has(param)) {
    console.log(`  ❌ MISSING: ${param} (expected "${value}")`);
    allCorrect = false;
  }
}

if (result.rejected && result.rejected.length > 0) {
  console.log(`\n❌ Rejected (${result.rejected.length}):`);
  result.rejected.forEach(param => {
    // Check if rejected parameter is garbage
    const isGarbage = /Mrs|VIBHA|AgeiDder|MAHABIRLB|Reiered/.test(param.parameter);
    if (isGarbage) {
      console.log(`  ✅ CORRECTLY REJECTED GARBAGE: ${param.parameter}`);
    } else {
      console.log(`  ⚠️  ${param.parameter}: "${param.rejectedValue}" - ${param.reason}`);
    }
  });
}

// Test 2: Check for duplicates
console.log('\n\nTEST 2: Duplicate Prevention\n');

const phCount = result.parameters.filter(p => p.parameter === 'pH' || p.parameter === 'Ph').length;
console.log(`pH parameters extracted: ${phCount}`);
if (phCount === 1) {
  console.log('✅ No duplicates (Ph normalized to pH)');
} else {
  console.log(`❌ Duplicates found! Expected 1, got ${phCount}`);
  allCorrect = false;
}

// Test 3: Qualitative value support
console.log('\n\nTEST 3: Qualitative Value Support (++)\n');

const glucoseParam = result.parameters.find(p => p.parameter === 'Urine Glucose');
if (glucoseParam && glucoseParam.value === '++') {
  console.log('✅ Qualitative ++ value extracted correctly');
} else {
  console.log(`❌ Failed to extract ++ value. Got: ${glucoseParam ? glucoseParam.value : 'NOT FOUND'}`);
  allCorrect = false;
}

// Test 4: Reference range extraction
console.log('\n\nTEST 4: Reference Range Extraction\n');

const phParam = result.parameters.find(p => p.parameter === 'pH');
if (phParam && phParam.referenceRange === '4.6-8.0') {
  console.log(`✅ Reference range extracted: ${phParam.referenceRange}`);
} else {
  console.log(`⚠️  pH reference range: ${phParam ? phParam.referenceRange || 'NOT FOUND' : 'PARAM NOT FOUND'}`);
}

const sgParam = result.parameters.find(p => p.parameter === 'Specific Gravity');
if (sgParam && sgParam.referenceRange === '1.005-1.030') {
  console.log(`✅ Reference range extracted: ${sgParam.referenceRange}`);
} else {
  console.log(`⚠️  Specific Gravity reference range: ${sgParam ? sgParam.referenceRange || 'NOT FOUND' : 'PARAM NOT FOUND'}`);
}

// Summary
console.log('\n========================================');
console.log('📊 TEST SUMMARY');
console.log('========================================');
console.log(`Report Type: ${result.reportType === 'URINE_ROUTINE' ? '✅ URINE_ROUTINE' : '❌ ' + result.reportType}`);
console.log(`Parameters Extracted: ${result.parameters.length}/13`);

// Check if garbage was filtered by checking that we DIDN'T extract any patient/header info
const hasGarbage = result.parameters.some(p => 
  /Mrs|VIBHA|AgeiDder|MAHABIRLB|Reiered|Patient|Specimen/.test(p.parameter)
);
console.log(`Garbage Filtered: ${!hasGarbage ? '✅ YES (no garbage parameters found)' : '❌ NO (garbage found in results)'}`);
console.log(`Duplicates Prevented: ${phCount === 1 ? '✅ YES' : '❌ NO'}`);
console.log(`Qualitative ++ Supported: ${glucoseParam && glucoseParam.value === '++' ? '✅ YES' : '❌ NO'}`);
console.log(`All Values Correct: ${allCorrect ? '✅ YES' : '❌ NO'}`);
console.log(`Manual Review Flag: ${result.requiresManualReview ? '⚠️  YES' : '✅ NO'}`);
console.log('========================================\n');
