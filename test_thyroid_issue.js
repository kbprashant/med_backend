const smartMedicalExtractor = require('./services/smartMedicalExtractor');

// Exact OCR text from the log
const ocrText = `SID No
OPD No
Name
Age/Sex
Ward/Unit
Test
:789168
: 133375
: Mrs.Eswari
OP
: 60 Yrs /Female
BIOCHEMISTRY
IGGG H&PGI - PDY
Free Triidothyroninc(FT3)
Free Thyroxine(FT4)
FREE TIHYROID PROFILE
Thyroid Stimulating
Hormone(TSH)
Result
3.26
0.85
0.78
Unit
Pg/ml
ng/dl
ul/ml
REPORT
Reg.Date:05.04.202/11:48
Report Date:05.01.2024/|1:49
Reference range
2.50 - 3.90
I'age # 1
0.61- 1. 12
0.34 - 5.60
BIOCHEMIST
`;

console.log('='.repeat(70));
console.log('Testing Thyroid Extraction with Exact OCR Text');
console.log('='.repeat(70));
console.log('\nOCR Text:');
console.log(ocrText);
console.log('\n' + '='.repeat(70));

const result = smartMedicalExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('EXTRACTION RESULT:');
console.log('='.repeat(70));
console.log('Success:', result.success);
console.log('Parameters:', result.parameters);
console.log('\nExpected:');
console.log('  FT3: 3.26 Pg/ml');
console.log('  FT4: 0.85 ng/dl');
console.log('  TSH: 0.78 ul/ml');
console.log('\nActual:');
result.parameters.forEach(p => {
  console.log(`  ${p.parameter}: ${p.value} ${p.unit}`);
});
console.log('='.repeat(70));
