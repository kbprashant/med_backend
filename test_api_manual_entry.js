/**
 * Test API response for Lipid Profile with reference values only
 * Simulates the Flutter app's API call
 */

// User's OCR text from the Flutter app (with reference values only)
const ocrTextWithReferences = `DRLOGY PATHOLOGY LAB  01234567R9 | 09: 2345678
Accurate | Caring | nstant  drlogypathlab@drlogy.com
1c5 138, 5MART VISKJN COPLEX, HE4LTHCARE ROAD, 0-POSITE4EALTHCARE COMPLEX, MUMEAI 651578
www.drlogy.com
Yashvi M. Patel Sample Collected At:
Age:21 Years 125, Shiy complex, SG Rcad, tAumbai
Scx Ienale Sample Collected By: Mı Suresh  Regislered on: 32:31 PM 02 Det, 2X
Collecled on: 33:11 PEA 02 Dcu, 2%
UHID: 556 Ref. By: Dr. Hiren Shah  Repprted on: 34:35 PM J2 Dec, 2X
LIPID PROFILE
Investigation Result Reference Value  Unit
Sampłe Type Serum(2 ml) TAT 1 dlay (Normal: 1 -3 days)
Chalesteral Total
: 200.00  mg/dL
Speulupl ureli
Triglycerides < 150.00  mg/dL
HDL Chalesterol
> 40.00  mg/dL
LDL Chalesterol c 100 n  rngidL
L.alc,lal cd
VLDL Chạlesteral
<30.00  mgdL
Caloulated
Non-HDL Cholesterol < 130,0[)  mg/dL
Calcslated`;

async function testApiCall() {
  console.log('========================================');
  console.log('TESTING API /api/extraction/analyze');
  console.log('========================================\n');

  try {
    const response = await fetch('http://localhost:5000/api/extraction/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ocrText: ocrTextWithReferences,
        reportDate: new Date().toISOString()
      })
    });

    const data = await response.json();

    console.log('✅ API Response Status:', response.status);
    console.log('\n📊 Response Data:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n========================================');
    console.log('KEY FIELDS:');
    console.log('========================================');
    console.log(`Success: ${data.success}`);
    console.log(`analysisComplete: ${data.analysisComplete}`);
    console.log(`requiresManualEntry: ${data.requiresManualEntry}`);
    console.log(`Report Type: ${data.reportType}`);
    console.log(`Parameters: ${data.parameters.length}`);
    console.log(`Message: ${data.message}`);

    if (data.requiresManualEntry) {
      console.log('\n✅ SUCCESS: API correctly flagged for manual entry!');
      console.log('   Flutter app should show manual entry screen.');
    } else {
      console.log('\n❌ ISSUE: API did not flag for manual entry.');
      console.log('   Flutter app would show incorrect values.');
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
  }

  console.log('\n========================================\n');
}

testApiCall();
