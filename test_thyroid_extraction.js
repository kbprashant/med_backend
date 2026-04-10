/**
 * Test Thyroid Profile Extraction
 * 
 * Tests extraction of thyroid parameters from actual OCR text
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

const ocrText = `B Dr Lat Patilatbs
Reg OT au Notional Beferinee Lal 7 EEE AAS PL SEE FE EE TE RL EE
Wels wen covt ne CINNG TRTTT LINTON TTI
Name : Ms. ANKITA
Lab No. : 390677380 Age : 23 Years
Ref By : SELF Gender : Female
Collected : 20:3'2023 12:26:00PM Reported : 20/3/2023 3:16:01PM
A'c Status :P Report Status © Final
Collected at : MAA SARASWATI PATHOLOGY Processed at  : LPL Bilaspur
DUBEY NURSING METERNITY NURSING HOME PLOT NO. 109:3 & 110/4, TILAK NAGAR.
TELIPARA ROAD BILASPUR - 495001 Bilaspur CHATAPARA. NEAR PETROL PUMP
BILASPUR BILASPUR - 495001
Thyroid Profile Total
TRIODOTHYRONINE ( 73) 84 ng/dL 35-193 ng/dL
Method : CMIA
TOTAL THYROXINE ( T4) 8.2 pg/dL 4.87 - 11.72 ug'dL
Method : CMIA
THYROID STIMULATING HORMONE (TSH) 3.0 ulU/mL 0.35 - 4.94 ulU/mL
Method : CMIA
Note
1. TSH levels are subject to circadian variation. reaching peak levels between 2 - 4.a.m. and at a
minimum between 6-10 pm . The variation is of the order of 50% . hence time of the day has
influence on the measured serum TSH concentrations.
2. Alte`;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           Testing Thyroid Profile Extraction                  ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📄 OCR Text Analysis:');
console.log('──────────────────────────────────────────────────────────────────────');
console.log('Expected Parameters:');
console.log('1. T3 (TRIODOTHYRONINE): 84 ng/dL (35-193 ng/dL)');
console.log('2. T4 (THYROXINE): 8.2 ug/dL (4.87-11.72 ug/dL)');
console.log('3. TSH: 3.0 uIU/mL (0.35-4.94 uIU/mL)');
console.log('──────────────────────────────────────────────────────────────────────\n');

// Run extraction
const result = extractWithStrictValidation(ocrText);

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('📊 EXTRACTION RESULTS');
console.log('══════════════════════════════════════════════════════════════════════\n');
console.log(`✅ Success: ${result.success}`);
console.log(`📋 Report Type: ${result.reportType}`);
console.log(`🔢 Parameters Found: ${result.parameters.length}\n`);

if (result.parameters.length > 0) {
  console.log('📝 Extracted Parameters:\n');
  result.parameters.forEach((param, index) => {
    console.log(`   ${index + 1}. ✅ ${param.parameter}`);
    console.log(`      Value: ${param.value} ${param.unit || ''}`);
    if (param.referenceRange) {
      console.log(`      Reference: ${param.referenceRange}`);
    }
    console.log();
  });
}

console.log('═'.repeat(70));
console.log('🧪 VALIDATION');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Check for expected parameters
const hasT3 = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('t3') || 
  p.parameter.toLowerCase().includes('triiodothyronine') ||
  p.parameter.toLowerCase().includes('triodothyronine')
);
const hasT4 = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('t4') || 
  p.parameter.toLowerCase().includes('thyroxine')
);
const hasTSH = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('tsh')
);

// Check for garbage parameters
const hasGarbage = result.parameters.some(p => 
  p.parameter.toLowerCase().includes('reg ot') ||
  p.parameter.toLowerCase().includes('collected') ||
  p.parameter.toLowerCase().includes('dubey') ||
  p.parameter.toLowerCase().includes('nursing') ||
  p.parameter.toLowerCase().includes('plot')
);

console.log('──────────────────────────────────────────────────────────────────────');
if (hasT3) {
  console.log('✅ T3 (TRIODOTHYRONINE) extracted');
} else {
  console.log('❌ T3 (TRIODOTHYRONINE) MISSING');
}

if (hasT4) {
  console.log('✅ T4 (THYROXINE) extracted');
} else {
  console.log('❌ T4 (THYROXINE) MISSING');
}

if (hasTSH) {
  console.log('✅ TSH extracted');
} else {
  console.log('❌ TSH MISSING');
}

if (hasGarbage) {
  console.log('❌ GARBAGE parameters extracted (header/address text)');
} else {
  console.log('✅ No garbage parameters extracted');
}

console.log('\n──────────────────────────────────────────────────────────────────────');
if (hasT3 && hasT4 && hasTSH && !hasGarbage) {
  console.log('✅ TEST PASSED: All thyroid parameters extracted, no garbage!');
} else if (!hasGarbage && (hasT3 || hasT4 || hasTSH)) {
  console.log('⚠️  TEST PARTIAL: Some parameters extracted correctly, but missing some');
} else {
  console.log('❌ TEST FAILED: Missing parameters or garbage extracted');
}

console.log('══════════════════════════════════════════════════════════════════════\n');
