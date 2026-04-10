/**
 * Test Electrolytes extraction with actual OCR text from user's report
 */

const smartExtractor = require('./services/smartMedicalExtractor');

const ocrText = `Yashvi M. Patel
Age: 21 Years
UHID: 556
Sex: Female
Investigation
Sample Type
Indirx:t ISE
DRLOGY PATHOLOGY LAB
ELECTROLYTES
Sodium
Potassium
105 -108, SMART VISION COMPLEX, HEALTHCARE ROAD, OPPOSITE HEALTHCARE COMPLEX. MUMBAI - 689570
Chloride
Bicarbonate
Calcium
Magnesium
Interpretation :
Accurate | Caring | Instant
Electrolytes High Levels cause:
. Chloride Overhydration, kidney disease.
status, kidney function, and electrolyte imbalances
Electrolytes Low Levels cause:
Result
4.50
Serum (2 ml)
140.00
Sample Collected At:
125, Shiv complex, SG Road, Mumbai
Sample Collected By: Mr Suresh
Ref. By: Dr. Hiren Shah
105.00
9.00
• Chloride - Dehydration, kidney disease.
25.00
2.00
• Sodium - Overhydration, kidney disease, Addison's disease.
Thanks for Reference
(DMLT, BMLT)
ELECTROLYTES
Medical Lab Technician
• Bicarbonate - Kidney disease, respiratory alkalosis.
www.drlogy.corn
• Sodium - Dehydration, kidney disease, Addison's disease.`;

console.log('='.repeat(70));
console.log('🧪 TESTING ELECTROLYTES EXTRACTION');
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
  
  // Validate expected results
  console.log('\n' + '='.repeat(70));
  console.log('✅ VALIDATION');
  console.log('='.repeat(70));
  
  const expectedParams = [
    { name: 'Sodium', value: 140, unit: 'mEq/L' },
    { name: 'Potassium', value: 4.5, unit: 'mEq/L' },
    { name: 'Chloride', value: 105, unit: 'mEq/L' },
    { name: 'Bicarbonate', value: 25, unit: 'mEq/L' },
    { name: 'Calcium', value: 9, unit: 'mg/dL' },
    { name: 'Magnesium', value: 2, unit: 'mg/dL' }
  ];
  
  expectedParams.forEach(expected => {
    const found = result.parameters.find(p => 
      p.parameter.toLowerCase().includes(expected.name.toLowerCase())
    );
    if (found) {
      const valueMatch = Math.abs(found.value - expected.value) < 0.1;
      console.log(`${valueMatch ? '✅' : '❌'} ${expected.name}: ${found.value} ${found.unit || ''} (expected: ${expected.value} ${expected.unit})`);
    } else {
      console.log(`❌ ${expected.name}: NOT FOUND (expected: ${expected.value} ${expected.unit})`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(70));
  const missing = expectedParams.filter(exp => 
    !result.parameters.some(p => p.parameter.toLowerCase().includes(exp.name.toLowerCase()))
  );
  
  if (missing.length === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`⚠️  MISSING ${missing.length} PARAMETERS: ${missing.map(m => m.name).join(', ')}`);
  }
  
} else {
  console.log(`❌ Extraction failed: ${result.message}`);
}

console.log('='.repeat(70));
