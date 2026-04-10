/**
 * Register a test user for API testing
 */

const http = require('http');

function makeRequest(path, data) {
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

async function registerAndVerify() {
  try {
    console.log('📝 Registering test user...');
    
    // Register
    const registerResponse = await makeRequest('/api/auth/register', {
      name: 'Test User',
      email: 'testuser@example.com',
      phoneNumber: '1234567890',
      password: 'Test@123'
    });
    
    console.log('Register Response:', registerResponse.status);
    console.log(JSON.stringify(registerResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

registerAndVerify();
