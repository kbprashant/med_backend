/**
 * Simulate the exact API call from Flutter logs to test status evaluation
 */

const http = require('http');

// Exact OCR text from Flutter logs
const ocrText = `sT@gwr :30.17
KKC LAB
.0pp.Govt.Hospital,TNHB, Perumalpattu, Veppampattu-602024
Emall : kkclab21@gmall.com | ) Cell : +91 8939 789 467
SID NO  01282
DATE  : 13-07-2025
PATIENT NAME: Aurora  : Female
SEX
REF, BY  :Setf
AGE  :56 Yrs
TEST  RESULT  UNITS  REFERENCE RANGE
BIO-CHEMSTRY
.Blood.sugareiog)
138  mg/dl  70 -- 110
Blood sugar (Post Prandial)  254  mg/d!  80- 140
Blood Pressuref BP)
10:35 Am
Time
Sys  155  mm of Hg
Dia  98  mm of Hg
Pul  85  Per/mint
End of Report
Lab Incharge
Worklg Hours:7.00 am -8.30 pm
THE GREA TEST WEALTH IS HEALTH
`;

function makeRequest(path, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const postData = method === 'POST' ? JSON.stringify(data) : '';
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { error: `Parse error: ${e.message}`, raw: responseData }
          });
        }
      });
    });
    
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testStatusFix() {
  console.log('🧪 Testing Status Evaluation Fix\n');
  console.log('=' .repeat(70));
  
  try {
    // Call analyze endpoint (no auth required for local test)
    console.log('📤 Calling /api/extraction/analyze...\n');
    
    const response = await makeRequest('/api/extraction/analyze', {
      ocrText: ocrText,
      reportDate: new Date().toISOString()
    });
    
    console.log(`✅ Response Status: ${response.status}\n`);
    
    if (response.data && response.data.parameters) {
      console.log(`📊 Extracted ${response.data.parameters.length} parameters:\n`);
      
      let allCorrect = true;
      
      response.data.parameters.forEach((param, index) => {
        console.log(`${index + 1}. ${param.parameter}`);
        console.log(`   Value: ${param.value} ${param.unit || ''}`);
        console.log(`   Reference: ${param.referenceRange || 'N/A'}`);
        console.log(`   Status: ${param.status}`);
        
        // Validate
        const value = parseFloat(param.value);
        let expected = 'NORMAL';
        
        if (param.parameter.toLowerCase().includes('fasting') && value > 110) {
          expected = 'HIGH';
        } else if (param.parameter.toLowerCase().includes('post') && value > 140) {
          expected = 'HIGH';
        }
        
        if (param.status === expected) {
          console.log(`   ✅ CORRECT: Status is ${param.status}\n`);
        } else {
          console.log(`   ❌ WRONG: Status is ${param.status}, expected ${expected}\n`);
          allCorrect = false;
        }
      });
      
      console.log('=' .repeat(70));
      if (allCorrect) {
        console.log('\n🎉 SUCCESS! All statuses are correct!\n');
        console.log('✅ Fasting Glucose 138 mg/dL (ref: 70-110) = HIGH');
        console.log('✅ Post Prandial 254 mg/dL (ref: 80-140) = HIGH\n');
      } else {
        console.log('\n❌ FAILED: Some statuses are still incorrect\n');
      }
      
    } else {
      console.log('⚠️  No parameters in response');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStatusFix();
