/**
 * Test Vitamin D extraction with actual OCR text from user's report
 */

const smartExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Yashvi M. Patel
Age:21 Years
UHID: 556
Sex: Female
Investigation
Sample Type
CLIA
DRLOGY PATHOLOGY LAB
VITAMIN D. 25- HYDROXY
LEVEL
Interpretation:
Deficient
105 -108, SMART VISION COMPLEX, HEALTHCARE ROAD, OPPOSITE HEALTHCARE COMPLEX. MUMBAI - 609570
Insufficient
Sufficient
Note:
Accurate | Caring | Instant
Comments
Potential inloxiculion> 250 nmol/L
< 50 nmol/L
Decreased Levels :
50-74 nmol/L
75-250 nmol/L
REFERENCE RANGE COMMENTS
Inadequate exposure to sunlight
• Nephrotic syndrome
Increased levels:
Severe Hepatocellular disease
• Drugs like Anticonvulsants
Thanks for Reference
www.drlogy.corr
VITAMIN D, 25 - HYDROXY
Sample Collected At:
Result
8D.00
. Vitamin D intoxication
125, Shiv complex, SG Road, Mumbai
Sample Collected By: Mr Suresh
Ref. By: Dr. Hiren Shah
Serum (3 ml)
• Optimal calcium absorption requires vitamin D 25 (OH) levels exceeding 75 nmol/L.`;

console.log('='.repeat(70));
console.log('🧪 TESTING VITAMIN D EXTRACTION');
console.log('='.repeat(70));
console.log('\nOCR Text:');
console.log(ocrText);
console.log('\n' + '='.repeat(70));

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
    console.log(`   Status: ${param.status || 'N/A'}`);
  });
  
  // Validate expected result
  console.log('\n' + '='.repeat(70));
  console.log('✅ VALIDATION');
  console.log('='.repeat(70));
  
  const vitDTest = result.parameters.find(p => 
    p.parameter.toLowerCase().includes('vitamin') || p.parameter.toLowerCase().includes('vit d')
  );
  
  if (vitDTest) {
    console.log(`✅ Vitamin D detected: ${vitDTest.parameter}`);
    console.log(`   Value: ${vitDTest.value} ${vitDTest.unit || ''}`);
    console.log(`   Expected: ~80 nmol/L (OCR error: "8D.00" → "80.00")`);
  } else {
    console.log(`❌ Vitamin D NOT FOUND`);
  }
  
} else {
  console.log(`❌ Extraction failed: ${result.message}`);
}

console.log('='.repeat(70));
