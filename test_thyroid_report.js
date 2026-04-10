/**
 * Test with real Thyroid report format (TATA 1mg Labs style)
 */

const genericExtractionService = require('./services/genericExtractionService');

// Simulating the OCR text from the thyroid report shown in screenshot
const thyroidOcrText = `
TATA 1mg Labs
Tata 1mg Technologies Private Limited

PO No: PO2225/04063/448
Name: Ms. ARTI DEVI
Age/Gender: 40/Female
Patient ID: OR2313045

Test Name                                    Result      Unit        Bio. Ref. Interval      Method

Thyroid Profile
T3, Total                                    1.55        ng/mL       0.80-1.81              CLIA
T4, Total                                    8.5         μg/L        4.5-12.6               CLIA
Thyroid Stimulating Hormone - Ultra          24.766      uIU/ml      0.55-4.78              CLIA
Sensitive

Comment:
Below mentioned are the guidelines for pregnancy related reference ranges for TSH: total T3 & Total T4.
`;

console.log('\n═══════════════════════════════════════════════');
console.log('   TESTING REAL THYROID REPORT FORMAT');
console.log('═══════════════════════════════════════════════\n');

try {
  const extracted = genericExtractionService.extractTestResults(thyroidOcrText);
  
  console.log(`\n📊 Extraction Results: ${extracted.length} parameters\n`);
  
  if (extracted.length > 0) {
    extracted.forEach((result, index) => {
      console.log(`${index + 1}. ${result.parameterName}`);
      console.log(`   Value: ${result.value}`);
      console.log(`   Unit: ${result.unit || 'N/A'}`);
      console.log(`   Reference: ${result.reference || 'N/A'}`);
      console.log('');
    });
    
    // Test type detection
    const testType = genericExtractionService.detectTestType(extracted);
    console.log(`\n🎯 Detected Test Type: ${testType.name}`);
    console.log(`   Type Code: ${testType.type}`);
    console.log(`   Confidence: ${(testType.confidence * 100).toFixed(0)}%`);
    
    // DB format
    const dbFormat = genericExtractionService.convertToDbFormat(extracted);
    console.log('\n📋 Database Format (Sample):');
    console.log(JSON.stringify(dbFormat[0], null, 2));
    
  } else {
    console.log('❌ No parameters extracted!');
    console.log('\nDebugging info:');
    console.log('OCR Text length:', thyroidOcrText.length);
    console.log('OCR Text preview:', thyroidOcrText.substring(0, 200));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

console.log('\n═══════════════════════════════════════════════\n');
