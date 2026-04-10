const SmartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');
const fs = require('fs');

const ocrText = fs.readFileSync('test_thyroid.txt', 'utf8');

console.log('📝 Testing Thyroid OCR Text:');
console.log('━'.repeat(70));
console.log('OCR Text Length:', ocrText.length, 'chars');
console.log('Numbers found:', (ocrText.match(/\d+(\.\d+)?/g) || []).length);
console.log('');

// Test extraction
async function runTest() {
  const result = await SmartMedicalExtractorV2(ocrText);

  console.log('📊 Extraction Results:');
  console.log('━'.repeat(70));
  console.log('Report Type:', result.reportType);
  console.log('Parameters Extracted:', result.parameters?.length || 0);
  console.log('');

  if (result.parameters && result.parameters.length > 0) {
    console.log('✅ Extracted Parameters:');
    result.parameters.forEach(param => {
      console.log(`   ${param.name}: ${param.value} ${param.unit || ''}`);
    });
  } else {
    console.log('❌ No parameters extracted');
    console.log('');
    console.log('🔍 Debugging:');
    console.log('   Contains "thyroid":', ocrText.toLowerCase().includes('thyroid'));
    console.log('   Contains "tsh":', ocrText.toLowerCase().includes('tsh'));
    console.log('   Contains "ft3":', ocrText.toLowerCase().includes('ft3'));
    console.log('   Contains "ft4":', ocrText.toLowerCase().includes('ft4'));
  }
}

runTest().catch(err => console.error('Error:', err));
