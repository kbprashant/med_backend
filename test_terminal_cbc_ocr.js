/**
 * Test column-aware extraction with OCR from terminal output
 */

const reportProcessingService = require('./services/reportProcessingService');

// OCR from terminal output (has proper table format)
const terminalCBCOCR = `Flabs  |HelloOlabs.in
. +91 7253928905
$ https:/www.flabs.in/
Name  r Dunuy  Pallent ID
Age/Gender  20/Male  Report ID RE1
Relerred By  Self  Collection Dale 24/06/2023 0849 PM
Pisone No  Report Date 24/06/2023 09-02 PM
HAEMATOLOGY
cOMPLETE BLOOD COUNT (CBC)
TEST DESCRIPTION  RESULT  REF RANGE  LJNIT
Haemoglobıt
15  13 17  g/dL
Total Leucocyle Coun  5000  4000 10000
Differerntıal LeucOcyte Cou!
Neulsophis  50  40 g0
Lymphocyles  20. 40
Eosınoplds  1  16
Monocytes  2 10
Basophils  0.00  0 1
Absolute Leucocyte Count
Absolute Neutrophils  2500.00  2000 7O00  CUMIn
Absolute Lynphocytes  2000.00  1000 3O00  /CuIIm
Absolute Eosinophils  50.00  20- 500  Cumnn
Absolute Monocyles  450 00  200 1000  iCumm
RBC Indices
RBC Count  5  45 55  Mil
lion/curii
MCV  80.00  81- 101
MCH  30 00  27.32
MCHC  37.50  31.5 -34.5  g/dl
He  $0  40 50
RDW CV  12  11 6 14D
ROW SD  39. 46  fL
Platetets Indices
Platele Cou  300000  150000 410000  fc:umm
PCT  35
MPV  75.11 5  1L
PDW
Ieterpretation'`;

async function testTerminalOCR() {
  try {
    console.log('='.repeat(70));
    console.log('🧪 TESTING TERMINAL OCR WITH COLUMN-AWARE EXTRACTION');
    console.log('='.repeat(70));
    console.log(`\n🔬 Extraction Mode: ${process.env.EXTRACTION_MODE || 'V1 (default)'}`);
    console.log(`📋 OCR Text Length: ${terminalCBCOCR.length} characters\n`);

    // Run extraction
    const result = await reportProcessingService.runSmartExtraction(terminalCBCOCR);

    console.log('\n✅ Extraction completed!');
    console.log(`   Report Type: ${result.reportType}`);
    console.log(`   Extraction Version: ${result.extractionVersion}`);
    console.log(`   Parameters Found: ${result.parameters.length}`);
    console.log(`   Average Confidence: ${result.averageConfidence.toFixed(2)}\n`);

    if (result.parameters.length > 0) {
      console.log('📊 Extracted Parameters:');
      console.log('-'.repeat(90));
      console.log('Parameter'.padEnd(30) + 'Value'.padStart(10) + '  ' + 'Unit'.padEnd(15) + 'Status'.padEnd(10) + 'Code');
      console.log('-'.repeat(90));
      
      result.parameters.forEach((param) => {
        const name = param.parameter || param.displayName || 'Unknown';
        const code = param.code || 'N/A';
        const status = param.status || 'N/A';
        const unit = param.unit || '';
        const conf = param.confidence ? ` (${(param.confidence * 100).toFixed(0)}%)` : '';
        
        console.log(
          name.substring(0, 29).padEnd(30) + 
          String(param.value).padStart(10) + '  ' +
          unit.substring(0, 14).padEnd(15) +
          status.padEnd(10) +
          code
        );
      });
      console.log('-'.repeat(90));
      
      // Validate expected values
      console.log('\n🎯 Validation:');
      const expectedValues = {
        'Hemoglobin': 15,
        'Total WBC Count': 5000,
        'Neutrophils': 50,
        'Lymphocytes': 20,
        'Eosinophils': 1,
        'Monocytes': 2,
        'Basophils': 0,
        'Absolute Neutrophils': 2500,
        'Absolute Lymphocytes': 2000,
        'Absolute Eosinophils': 50,
        'Absolute Monocytes': 450,
        'RBC Count': 5,
        'MCV': 80,
        'MCH': 30,
        'MCHC': 37.5,
        'RDW-CV': 12,
        'Platelet Count': 300000
      };
      
      let correct = 0;
      let total = 0;
      
      for (const [paramName, expectedValue] of Object.entries(expectedValues)) {
        const extracted = result.parameters.find(p => 
          (p.parameter || p.displayName) === paramName
        );
        
        if (extracted) {
          total++;
          if (extracted.value === expectedValue) {
            correct++;
            console.log(`   ✅ ${paramName}: ${extracted.value} (CORRECT)`);
          } else {
            console.log(`   ❌ ${paramName}: ${extracted.value} (Expected: ${expectedValue})`);
          }
        } else {
          console.log(`   ⚠️  ${paramName}: Not extracted`);
        }
      }
      
      console.log(`\n📊 Accuracy: ${correct}/${total} correct (${((correct/total)*100).toFixed(1)}%)`);
      
    } else {
      console.log('❌ NO PARAMETERS EXTRACTED!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run test
testTerminalOCR();
