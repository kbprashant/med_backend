/**
 * Quick test to verify API endpoints are working
 */

const axios = require('axios');

async function testAPI() {
  try {
    // You need to replace this with a valid auth token
    const token = 'YOUR_AUTH_TOKEN_HERE';
    const baseURL = 'http://localhost:3000/api/reports';

    console.log('=== Testing API Endpoints ===\n');

    // Test 1: Get test history
    console.log('1. Testing GET /tests/history');
    try {
      const historyResponse = await axios.get(`${baseURL}/tests/history`, {
        params: { testName: 'Thyroid Test' },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('   ✓ Success!');
      console.log(`   Results: ${historyResponse.data.results?.length || 0}`);
    } catch (err) {
      console.log('   ✗ Error:', err.response?.data || err.message);
    }

    console.log('\n2. Testing GET /tests/recent');
    try {
      const recentResponse = await axios.get(`${baseURL}/tests/recent`, {
        params: { testName: 'Thyroid Test', limit: 3 },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('   ✓ Success!');
      console.log(`   Results: ${recentResponse.data.results?.length || 0}`);
    } catch (err) {
      console.log('   ✗ Error:', err.response?.data || err.message);
    }

    console.log('\n3. Testing GET /tests/full-history');
    try {
      const fullHistoryResponse = await axios.get(`${baseURL}/tests/full-history`, {
        params: { testName: 'Thyroid Test' },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('   ✓ Success!');
      console.log(`   Total Results: ${fullHistoryResponse.data.totalResults || 0}`);
    } catch (err) {
      console.log('   ✗ Error:', err.response?.data || err.message);
    }

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Note: You need to get a valid auth token first by logging in
console.log('Note: Update the token variable with a valid auth token from your app\n');
console.log('To get a token:');
console.log('1. Login to the app');
console.log('2. Check SharedPreferences or local storage');
console.log('3. Or add console.log in Flutter to print the token\n');

// Uncomment to run:
// testAPI();
