/**
 * Test Blood Sugar Extraction API with Garbled Parameter Names
 * 
 * Tests the /api/extraction/analyze endpoint with OCR text that has
 * garbled parameter names to verify both parameters are extracted.
 */

const axios = require('axios');

// OCR text from user's logs
const userOcrText = `: Co CE EEE EE
; pre exdg A OTTARWD ayia), adr aruda ND Suds revgy mTBET Qendga@ pn.
4 aGrfuwir :30.17 Pp
1 \\ KKC LAB
® +Opp.Govt.Hospital, TNHB, Perumalpattu,Veppampattu-602024
| Email : kkclab21@gmail.com | ® Cell : +91 8939 789 467
SID NO : 01282 DATE : 13-07-2025
JPATIENT NAME: Aurora SEX . Female
REF. BY : Self AGE : 56 Yrs
TEST RESULT UNITS REFERENCE RANGE
BIO-CHEMISTRY
mpd RICOD8GE ting) 138 mg/d] 70-110
Blood sugar (Post Prandial) 254 mg/d 80 - 140
§
§
| —~——— End of Report. ———
E
pr : Lab pe
THE CREATEST WEALTHB HEALTH |`;

async function testAPI() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Testing Blood Sugar API with Garbled Parameter Names      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('🔬 Test Case: Blood Sugar Report with Garbled Fasting Parameter');
  console.log('   Expected: Both Fasting and Postprandial should be extracted\n');

  try {
    const response = await axios.post('http://localhost:5000/api/extraction/analyze', {
      ocrText: userOcrText,
      reportDate: new Date().toISOString()
    });

    const data = response.data;

    console.log('✅ API Response Received\n');
    console.log('═'.repeat(70));
    console.log('📊 RESPONSE DATA');
    console.log('═'.repeat(70));
    console.log(`Success: ${data.success}`);
    console.log(`Report Type: ${data.reportType}`);
    console.log(`Report Type Name: ${data.reportTypeName}`);
    console.log(`Home Category: ${data.homeCategory}`);
    console.log(`Parameters Extracted: ${data.extractedParameters}`);
    console.log(`Confidence: ${data.confidence}%`);
    console.log(`Analysis Complete: ${data.analysisComplete}`);
    console.log(`Requires Manual Entry: ${data.requiresManualEntry}`);

    if (data.parameters && data.parameters.length > 0) {
      console.log('\n📝 Extracted Parameters:\n');
      data.parameters.forEach((param, index) => {
        console.log(`   ${index + 1}. ${param.parameter}`);
        console.log(`      Value: ${param.value} ${param.unit || ''}`);
        if (param.referenceRange) {
          console.log(`      Reference: ${param.referenceRange}`);
        }
        if (param.status) {
          console.log(`      Status: ${param.status}`);
        }
        console.log('');
      });
    }

    // Verify both parameters were extracted
    console.log('═'.repeat(70));
    console.log('🧪 VALIDATION');
    console.log('═'.repeat(70) + '\n');

    const hasFasting = data.parameters.some(p => 
      p.parameter.toLowerCase().includes('fasting')
    );
    const hasPostprandial = data.parameters.some(p => 
      p.parameter.toLowerCase().includes('postprandial') || 
      p.parameter.toLowerCase().includes('post prandial')
    );

    if (hasFasting && hasPostprandial && data.parameters.length === 2) {
      console.log('✅ TEST PASSED: Both parameters extracted correctly!');
      console.log('   ✅ Fasting Glucose: Found');
      console.log('   ✅ Postprandial Glucose: Found');
      console.log('   ✅ No duplicates (exactly 2 parameters)');
    } else {
      console.log('❌ TEST FAILED:');
      console.log(`   ${hasFasting ? '✅' : '❌'} Fasting Glucose`);
      console.log(`   ${hasPostprandial ? '✅' : '❌'} Postprandial Glucose`);
      console.log(`   ${data.parameters.length === 2 ? '✅' : '❌'} Count (expected 2, got ${data.parameters.length})`);
    }

  } catch (error) {
    console.error('❌ API Request Failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.statusText}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.error('\n⚠️  Make sure the backend server is running on port 5000');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

testAPI();
