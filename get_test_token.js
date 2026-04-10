/**
 * Script to create a test user and get a token for testing
 */

const http = require('http');

async function registerUser(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email,
      password,
      name: 'Test User',
      phoneNumber: '1234567890'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk;  });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const email = 'test-v2-extraction@example.com';
  const password = 'password123';

  try {
    console.log('🔑 Getting authentication token...\n');

    // Try to login first
    let loginResponse = await loginUser(email, password);
    
    if (loginResponse.error || !loginResponse.token) {
      console.log('👤 User not found, creating new user...');
      const registerResponse = await registerUser(email, password);
      
      if (registerResponse.token) {
        console.log('✅ User registered successfully!\n');
        console.log('📋 Token:', registerResponse.token);
        return registerResponse.token;
      } else {
        console.error('❌ Registration failed:', registerResponse);
        return null;
      }
    }

    console.log('✅ Login successful!\n');
    console.log('📋 Token:', loginResponse.token);
    return loginResponse.token;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Execute and export
main().then(token => {
  if (token) {
    console.log('\n✅ Token obtained successfully!');
    console.log('Use this token in your test scripts:\n');
    console.log(`  Authorization: Bearer ${token}\n`);
  } else {
    console.log('\n❌ Failed to obtain token');
    process.exit(1);
  }
});

module.exports = { registerUser, loginUser };
