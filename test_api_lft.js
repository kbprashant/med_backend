/**
 * Test actual API endpoint to verify server is using updated dictionary
 */

const axios = require('axios');

const lftOCR = `DRLOGY PATHOLOGY LAB  0123456789 | 0912345578
Accurate | Caring | Instant  drlogypathlab@drlogy.com
1C5 138, 5MART VISKJN COMPLEX, HEALTHCARE RCAD, 0-POSITEHEALTHCARE COMPLEX, MUMBAI 681578
www.drlogy.com
Yash M. Patel  Şample Collected At:
Age:21 Years  125. Shiwari Burıgaluw. SG lluä,
Scx Male  Murnba  Regislered an: 32:31 PM 02 Det, 2X
Gollecled on: 33:11 PEA 02 Dee, 2%
PID:555  Ref. By: Dr. Hiren Şhah  Reported on: 34:25 PM 02 Dec, 2%
LIVER FUNCTION TEST (LFT)
Investigation  Result Reference Value  Uait
Primary Sample Type :  Serum
AST (SGOT)  16.00 15.00- 40.DD
ALT (SGPT)  100.50 High 10,00- 49.DD
IFCCA t 5
AST:ALT Ratio  0.50 <1.00
GGTP  10.20 0-73  U/L
Alkaline Phosphatase (ALP)  15.40 30.00-120.00
Blirubln Total  0.60 030-1.20  ang/dL
BJlirubln Direct  0.10 <0.3  ng/dL
Bilirubln lndlrect  0.10 <].10  ng/dL
Calculated
Total Protein  6.39 5.70 -8.20  g/dL
Giut
Albumin  2.00 3.70 - 4A.BD  g'dL
A:GRatio  0.10 0.90 -2.0D
Note :
1.In an asymptomatic patient, Non alcoholic fatty liver disease (NAFLD} is`;

async function testAPI() {
  console.log('\n🌐 Testing API Endpoint\n');
  console.log('='.repeat(80));
  
  try {
    // Set extraction mode
    process.env.EXTRACTION_MODE = 'V2';
    
    const response = await axios.post('http://localhost:5000/api/extraction/analyze', {
      ocrText: lftOCR
    });
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`\n📊 Extraction Results:`);
    console.log(`   Report Type: ${response.data.reportType}`);
    console.log(`   Parameters: ${response.data.parameters.length}`);
    console.log(`   Confidence: ${response.data.confidence}\n`);
    
    console.log('📋 Parameters Returned by API:');
    console.log('-'.repeat(80));
    
    response.data.parameters.forEach((param, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${param.parameter.padEnd(30)} ${String(param.value).padStart(8)} ${(param.unit || '').padEnd(10)} [${param.code}]`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    if (response.data.parameters.length >= 12) {
      console.log('\n✅ SUCCESS: API returning all 12 parameters!');
    } else {
      console.log(`\n⚠️  WARNING: Only ${response.data.parameters.length} parameters returned (expected 12)`);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testAPI();
