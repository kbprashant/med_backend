const smartMedicalExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Diagnostics
Name of Patient
LEADING THE WAY PROFESSIONALY
Age/Gender
Collected AT
Referred BY
Sample Type
Ref Customer
Test Name
Volume
Colour
Appearance
Ph
Specific Gravity
Urine Protein.
Urine Glucose.
Ketone
Gross Examination(Physical Examination)
Chemical Examination
Nitrite
Blood
CRL
Urobilinogen
Urine Bilirubin
Leukocyte
R.B.C.
Pus Cells
Epithelial Cells
Casts
Crystals
R
Bacteria
: Mrs. VIBHA GUPTA
Budding yeast Ceils
Others
:72 Yrs/Female
:MAHABIR LAB
:NA
:Urine- BI439463
Result
20.0
YELLOW
5.0
SLIGHTLY TURBID
1020
++
Microscopic Examination(Light Microscopy)
NEGATIVE
URINE EXAMINATION ROUTINE
NEGATIVE
NEGATIVE
NEGATIVE
NORMAL
NEGATIVE
NEGATIVE
NIL
3-5
2-3
NL
CLINICAL PATHOLOGY
NL
NL
NA
NI`;

console.log('🧪 Testing Urine Report: Mrs. VIBHA GUPTA');
console.log('='.repeat(60));

const extracted = smartMedicalExtractor.extract(ocrText);

console.log(`\n📊 Extraction Results:`);
console.log(`   Success: ${extracted.success}`);
console.log(`   Total parameters: ${extracted.parameters ? extracted.parameters.length : 0}`);
console.log('\n📋 Extracted Parameters:');
if (extracted.parameters) {
  extracted.parameters.forEach((param, index) => {
    console.log(`   ${index + 1}. ${param.parameter}: ${param.value} ${param.unit || ''}`);
  });
} else {
  console.log('   No parameters extracted');
}
