/**
 * Test LFT extraction with heavily garbled OCR
 * This is the actual OCR from the user's report
 */

const { extractWithStrictValidation } = require('./services/strictExtractionService');

const ocrText = `DRLOGY PATHOLOGY LAB t susssoms josissen
® Accurate | Caring | Instant driogypathlaba@driogy.com
YashM.Patel Sample Collected Au [LTT
21 Yeas 5 CR EE oe i
Sex: Male fooesd Colieted rt 05:11 PM a2 De, 2
PID : 555 BREE Ref. By: Dr. Hiren Shah Reported on: 04:35 PM 02 Dec, 2X
LIVER FUNCTION TEST (LFT)
Investigation Result Reference Value Unit
primary Sample Type Serum
ss (scom) To 1500-4000 wn
ao er) 10050 bigh 1000-4900 wn
ATALT Ratio 0s a0
jens 0 0-7 ue
Alkaline Phosphatase (ALP) 15.40 Low 30.00 -120.00 uiL
Blasi Tots oe 030-120 mga
Blasi Direct 010 wa gral
Blab Indirect 010 an gral
Tora Protein 6 70-020 wl
Albumin 2.00 3.20-4.80 g/dL
*eaRato ato 050-200
Note:
1.In an asymptomatic patient, Non alcoholic fatty liver disease (NAFLD) is the most common cause of increased
AST, ALY levels NALD 1 consider ss hepatic manifestation of metabolic ynchome
2 In most type ofr disease, ALT acti Higher thn hat of AST, exception may be seen in Alcaholc Hepatitis,
Hepat Cithasis and Liver neoplasia. In a patient with Choe ve`;

console.log('🧪 Testing LFT Extraction with Garbled OCR\n');
console.log('='.repeat(70));

const result = extractWithStrictValidation(ocrText);

console.log('\n' + '='.repeat(70));
console.log('📊 EXTRACTION RESULTS');
console.log('='.repeat(70));
console.log(`Report Type: ${result.reportType}`);
console.log(`Success: ${result.success}`);
console.log(`Parameters Extracted: ${result.parameters.length}`);
console.log(`Parameters Rejected: ${result.rejected ? result.rejected.length : 0}`);

if (result.parameters.length > 0) {
  console.log('\n✅ EXTRACTED PARAMETERS:');
  result.parameters.forEach(param => {
    console.log(`   ${param.parameter}: ${param.value} ${param.unit || ''} [${param.status || 'N/A'}]`);
    if (param.referenceRange) {
      console.log(`      Reference: ${param.referenceRange}`);
    }
  });
} else {
  console.log('\n❌ No parameters extracted');
}

if (result.rejected && result.rejected.length > 0) {
  console.log('\n❌ REJECTED PARAMETERS:');
  result.rejected.forEach(param => {
    console.log(`   ${param.parameter}: "${param.rejectedValue}" - ${param.reason}`);
  });
}

console.log('\n' + '='.repeat(70));
