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

console.log('📋 Parameter order in OCR:');
const lines = ocrText.split('\n');
let inParamSection = false;
let params = [];

for (const line of lines) {
  const trimmed = line.trim();
  
  if (/test\s+name/i.test(trimmed)) {
    inParamSection = true;
    continue;
  }
  
  if (/^result$/i.test(trimmed)) {
    break;
  }
  
  if (inParamSection && trimmed.length > 0 && trimmed.length < 50) {
    if (/volume|colour|appearance|ph|specific|protein|glucose|ketone|nitrite|blood|urobilinogen|bilirubin|leukocyte|r\.?b\.?c|pus|epithelial|cast|crystal|bacteria|yeast/i.test(trimmed)) {
      params.push(trimmed);
      console.log(`   ${params.length}. ${trimmed}`);
    }
  }
}

console.log('\n📋 Values in OCR:');
let inValueSection = false;
let values = [];

for (const line of lines) {
  const trimmed = line.trim();
  
  if (/^result$/i.test(trimmed)) {
    inValueSection = true;
    continue;
  }
  
  if (/biological\s+reference|microscopic\s+examination/i.test(trimmed)) {
    break;
  }
  
  if (inValueSection && trimmed.length > 0) {
    if (!/examination|routine|urine|result|test\s+name/i.test(trimmed)) {
      values.push(trimmed);
      console.log(`   ${values.length}. ${trimmed}`);
    }
  }
}

console.log('\n📊 Parameter-Value Mapping (Current):');
for (let i = 0; i < Math.min(params.length, values.length); i++) {
  console.log(`   ${params[i]} = ${values[i]}`);
}
