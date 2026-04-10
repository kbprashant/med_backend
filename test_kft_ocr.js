/**
 * Test script for KFT OCR extraction with decimal corrections
 */

const smartMedicalExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Yashvi M. Patel
Ape:21 Years
Sex: Female
UHID 556
Investigation
Urea
Sample Type
irenseLfN
Creatinine
Uric Acid
Modfed dafte Kee
Calciuum
Phosphorus
DRLOGY PATHOLOGY LAB
Albumin
Alkalise Phosphiatase (ALP)
Total Protein
Sodium
105 108 SMART VssON COMPLEX, HEALTHCARE ROAD, OePOSITE HEALTHCARE COMPLEK MUMBA 689578
Potassium
Indiect iSt
Chloride
Indrect ssE
Accurate | Caring | Instant
ADVICE: CKD RISK MAP
Thanks for Referençe
Medical Lab Technician
(DMLT, BMLT)
Result
KIDNEY FUNCTION TEST (KFT)
16.00
Serun (2 ml)
20
150
6.50
3.50
Sample Collected At:
100.00
125, Shiv complexSG Road. Mumbai
Sample Collected By: Mr Suresh
Ref. By: Dr. Hiren Shah
3.50
3.50
Normal
Ta Check egart Athenticity by Scannlig OR Cede on top
Normal
Normal
Normal
Normal
Normal
Normal
Normal
DrloGL.Com
Normal
Normals
Reference Value
TAT: 1 day (Nomal 1-3 days)
1300-43 00
450NormsaL 00- 120 00Ot CuL
0 60-1.30
Dr. Payal Shah
OMD Pathalogist)
3.5-7.2`;

console.log('\n' + '='.repeat(70));
console.log('🧪 Testing KFT Report OCR Extraction');
console.log('='.repeat(70));

console.log('\n📄 OCR Text (first 500 chars):');
console.log(ocrText.substring(0, 500) + '...\n');

console.log('🔍 Running SmartMedicalExtractor...\n');
const result = smartMedicalExtractor.extract(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULT');
console.log('='.repeat(70));
console.log(`Success: ${result.success}`);
console.log(`Parameters Found: ${result.parameters ? result.parameters.length : 0}`);
console.log(`Message: ${result.message || 'N/A'}`);

if (result.parameters && result.parameters.length > 0) {
  console.log('\n✅ Extracted Parameters:');
  result.parameters.forEach((param, idx) => {
    const status = param.value > 0 ? '✅' : '⚠️';
    console.log(`\n  ${idx + 1}. ${param.parameter}`);
    console.log(`     Value: ${param.value} ${param.unit || ''}`);
    console.log(`     Confidence: ${param.confidence || 'N/A'}`);
  });
  
  console.log('\n\n🔍 VALIDATION CHECK:');
  const creatinine = result.parameters.find(p => /creatinine/i.test(p.parameter));
  const uricAcid = result.parameters.find(p => /uric.*acid/i.test(p.parameter));
  const sodium = result.parameters.find(p => /sodium/i.test(p.parameter));
  
  if (creatinine) {
    const isValid = creatinine.value >= 0.5 && creatinine.value <= 5;
    console.log(`  Creatinine: ${creatinine.value} ${creatinine.unit} - ${isValid ? '✅ VALID' : '❌ INVALID (should be 0.6-1.3)'}`);
  }
  
  if (uricAcid) {
    const isValid = uricAcid.value >= 1 && uricAcid.value <= 20;
    console.log(`  Uric Acid: ${uricAcid.value} ${uricAcid.unit} - ${isValid ? '✅ VALID' : '❌ INVALID (should be 3.5-7.2)'}`);
  }
  
  if (sodium) {
    const isValid = sodium.value >= 120 && sodium.value <= 160;
    console.log(`  Sodium: ${sodium.value} ${sodium.unit} - ${isValid ? '✅ VALID' : '❌ INVALID (should be 135-145)'}`);
  } else {
    console.log(`  Sodium: NOT EXTRACTED (likely filtered due to invalid value)`);
  }
} else {
  console.log('\n❌ No parameters extracted');
}

console.log('\n' + '='.repeat(70));
