const axios = require('axios');

const baseURL = 'http://localhost:5000/api/reports';

// Replace with your actual auth token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMzViNGM3My1jYzUxLTRiNWMtODJhYi1iMzNhYjE3MTI2N2QiLCJpYXQiOjE3MzkxNzM5NDgsImV4cCI6MTczOTc3ODc0OH0.qMYx_TvKzYLRR5ZRhS8JlckZ1YqNfC1OwhPCt9rY0Os';

async function testHistory() {
  try {
    console.log('\n🔍 Testing GET /api/reports/tests/history?testName=Diabetes Panel');
    const response = await axios.get(`${baseURL}/tests/history`, {
      params: { testName: 'Diabetes Panel' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`\n✅ Status: ${response.status}`);
    console.log(`📊 Found ${response.data.results.length} results:`);
    response.data.results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.parameterName}: ${r.value} ${r.unit} [${r.status}]`);
    });
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHistory();
