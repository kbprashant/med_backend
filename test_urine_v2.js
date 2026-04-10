/**
 * Test Urine Analysis V2 Extraction
 */

const smartMedicalExtractorV2 = require('./services/smartMedicalExtractorV2');

// OCR text from the user's first actual urine report (complete with microscopic section)
const ocrText = `#008, Wing-3, Devi Krupa,
E-mail: contactêcrystaldatainc.com
Pant Naga, Ghatkopar (E)
CrystaldataincRgmail.com
Mumbai - 400 075  Www.crystalodatainc,Com  VIRINIO,
NSIC-CRISIL SE3C
Crystal Data Inc.
cONSULTING, DEVELOPMENT, SUPPORT  Phono;022-21022430/21021949/ G5883988
Mobile :9820373936/ 9920548030
LAB NO.  DATE  12-Aug-2011
PATIENT NAME  MR. KETAN CHAVAN  SEX  Male
REF, BY DR.  DR. PATIL M.B.B.S.  AGE  29 Years
SAMPLE COLL. AT  : CRYSTAL LAB
ROUTINE URINE EXAMINATION
PHY5. CAL EXA1!}A T1ON
Quantity  10 ml
Colour  Yellowish
Appearance  Clear
Deposit  Absent
pH  Acidic
Specil:c Gravty  1.011
CHEN.CAL E xA,4:AICN
Proteins  Absent
Sugar  Absent
Ketone  Absent
Bile Pıgment  Trace
Bile Salts  Absent
Ocçult Biood  Trace
Urobilinogen  Normal
Pus Cells  Absent
Few Scen
Epthelal Cells
Red Biood Cells
Absent
Casts  Absent
Crystals  Absent
Other Findings
Nil
End of Report
Chandan Vartak  Dr. Pankaj Shah
D.M.L.T.  M.D. M.B.B.S.
Highligh:od Rosu Valuas Indicate Abromal`;

async function testExtraction() {
  console.log('='.repeat(70));
  console.log('🧪 TESTING URINE ANALYSIS V2 EXTRACTION');
  console.log('='.repeat(70));
  console.log(`OCR Text Length: ${ocrText.length} characters\n`);

  try {
    const result = await smartMedicalExtractorV2(ocrText);

    console.log('='.repeat(70));
    console.log('📊 EXTRACTION RESULTS');
    console.log('='.repeat(70));
    console.log(`Report Type: ${result.reportType}`);
    console.log(`Extraction Version: ${result.extractionVersion}`);
    console.log(`Parameters extracted: ${result.parameters.length}`);
    console.log(`Average Confidence: ${result.averageConfidence.toFixed(2)}\n`);

    if (result.parameters.length > 0) {
      console.log('Extracted Parameters:');
      console.log('-'.repeat(70));
      
      result.parameters.forEach((param, idx) => {
        console.log(`${idx + 1}. ${param.displayName}`);
        console.log(`   Code: ${param.code}`);
        console.log(`   Value: ${param.value}`);
        console.log(`   Unit: ${param.unit || 'N/A'}`);
        console.log(`   Status: ${param.status}`);
        console.log(`   Confidence: ${(param.confidence * 100).toFixed(0)}%`);
        console.log('');
      });
    } else {
      console.log('❌ No parameters extracted!');
    }

    console.log('='.repeat(70));
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    console.error(error.stack);
  }
}

testExtraction();
