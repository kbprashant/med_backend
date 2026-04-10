/**
 * Test Urine Analysis extraction
 */

const smartExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Crystal Data Inc.
cONSULrING, DEVELOPMENT, SUPPORT
LAB NO.
PATIENT NAME
REE, BY DR.
SAMPLE COLL. AT
PHYSIGAL EXAMINATION
Quantity
Colour
Appearance
Deposit
pH
Specific Gravity
CHEMICAL EXAMINATION
Proteins
Sugar
Ketone
Bile Pigment
Bile Salts
Occult Blood
Urobilinogen
Pus Cells
Epithelial Gells
Red Blood Cells
Casts
Crystals
# 008, Wing-3, Devi Krupa,
Pant Nagar, Ghatkopar (E)
Mumbai - 400 075
Other Findings
Chandan Vartak
D.M.L.T
5
MR. KETAN CHAVAN
DR. PATIL M.B.B.S.
CRYSTAL LAB
Highlighted Result Values Indicate Abnormal
Report Printed By Y Lab wew.crvstaldatalns. com
10 ml
ROUTINE URINE EXAMINATION
Yellowish
Clear
Absent
MICROScOPIC EXAMINATION OF CENTRIFYGALUSED DEPOsiT
Acidic
1.011
Absent
Absent
Absent
Trace
Absent
Trace
Normal
Absent
Few Seen
Absent
Absent
Absent`;

console.log('='.repeat(70));
console.log('🧪 TESTING URINE ANALYSIS EXTRACTION');
console.log('='.repeat(70));

const result = smartExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(70));

if (result.success) {
  console.log(`✅ Extraction successful!`);
  console.log(`📝 Parameters extracted: ${result.parameters.length}`);
  console.log('\nExtracted Parameters:');
  
  result.parameters.forEach((param, idx) => {
    console.log(`\n${idx + 1}. ${param.parameter}`);
    console.log(`   Value: ${param.value}`);
    console.log(`   Unit: ${param.unit || 'N/A'}`);
  });
} else {
  console.log(`❌ Extraction failed: ${result.message}`);
}

console.log('='.repeat(70));
