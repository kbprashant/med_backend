/**
 * Test script to verify status evaluation in extraction API endpoint
 * Simulates uploading a blood sugar report and checks if statuses are correct
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test@123'
};

// Sample blood sugar report OCR text with HIGH values
const bloodSugarOcrText = `
DIABETES MONITORING REPORT
Patient Name: John Doe
Date: 2024-01-15

LABORATORY RESULTS

FASTING BLOOD SUGAR: 138 mg/dL
Reference Range: 70-110 mg/dL

POST PRANDIAL GLUCOSE: 254 mg/dL
Reference Range: <140 mg/dL

HbA1c: 7.2 %
Reference Range: 4.0-5.7 %
`;

/**
 * Make HTTP POST request
 */
function makeRequest(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
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
            data: { error: `Failed to parse response: ${e.message}`, raw: responseData }
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Login and get auth token
 */
async function login() {
  console.log('🔐 Logging in as test user...');
  
  const response = await makeRequest('/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (response.status === 200 && response.data.token) {
    console.log('✅ Login successful\n');
    return response.data.token;
  } else {
    throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
  }
}

async function testStatusEvaluation() {
  console.log('🧪 Testing Status Evaluation in Extraction API\n');
  console.log('=' .repeat(60));

  try {
    // Step 0: Login first
    const token = await login();
    
    // Step 1: Call analyze endpoint
    console.log('📤 Calling /api/extraction/analyze endpoint...\n');
    
    const analyzeResponse = await makeRequest('/api/extraction/analyze', {
      ocrText: bloodSugarOcrText,
      mode: 'V2'
    }, token);

    console.log('✅ Analysis Response Status:', analyzeResponse.status);
    console.log('\n📊 Extracted Parameters:\n');

    const parameters = analyzeResponse.data.finalParameters || [];
    
    if (parameters.length === 0) {
      console.log('⚠️  No parameters extracted!');
      return;
    }

    // Display each parameter with its status
    parameters.forEach((param, index) => {
      console.log(`${index + 1}. ${param.parameterName}`);
      console.log(`   Value: ${param.value} ${param.unit || ''}`);
      console.log(`   Reference Range: ${param.referenceRange || 'N/A'}`);
      console.log(`   Status: ${param.status}`);
      
      // Validate status
      const value = parseFloat(param.value);
      if (param.parameterName.toLowerCase().includes('fasting') && value > 110) {
        if (param.status === 'HIGH') {
          console.log(`   ✅ CORRECT: Fasting Glucose ${value} > 110 should be HIGH`);
        } else {
          console.log(`   ❌ WRONG: Fasting Glucose ${value} > 110 should be HIGH, got ${param.status}`);
        }
      } else if (param.parameterName.toLowerCase().includes('post') && value > 140) {
        if (param.status === 'HIGH') {
          console.log(`   ✅ CORRECT: Post Prandial ${value} > 140 should be HIGH`);
        } else {
          console.log(`   ❌ WRONG: Post Prandial ${value} > 140 should be HIGH, got ${param.status}`);
        }
      } else if (param.parameterName.toLowerCase().includes('hba1c') && value > 5.7) {
        if (param.status === 'HIGH') {
          console.log(`   ✅ CORRECT: HbA1c ${value} > 5.7 should be HIGH`);
        } else {
          console.log(`   ❌ WRONG: HbA1c ${value} > 5.7 should be HIGH, got ${param.status}`);
        }
      }
      console.log('');
    });

    console.log('=' .repeat(60));
    console.log('\n✅ Test completed successfully!');
    
    // Count statuses
    const statusCounts = parameters.reduce((acc, param) => {
      acc[param.status] = (acc[param.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(`   ${error.message}`);
  }
}

// Run the test
testStatusEvaluation();
