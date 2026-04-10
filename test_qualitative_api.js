const axios = require('axios');

async function testQualitativeValues() {
  try {
    console.log('🧪 Testing test history API with qualitative values\n');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      phoneNumber: '+917057472447',
      password: 'Ajit@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');
    
    // Get test history for URINE_ANALYSIS
    const historyResponse = await axios.get('http://localhost:5000/api/reports/tests/history', {
      params: {
        testName: 'URINE_ANALYSIS'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`📊 Received ${historyResponse.data.results.length} test results\n`);
    
    // Show first 10 results
    console.log('First 10 results:');
    historyResponse.data.results.slice(0, 10).forEach((result, index) => {
      const valueType = typeof result.value;
      const valueDisplay = valueType === 'string' ? `"${result.value}"` : result.value;
      console.log(`${index + 1}. ${result.parameterName}: ${valueDisplay} (${valueType}) ${result.unit || ''}`);
    });
    
    // Check for qualitative values
    const qualitativeParams = historyResponse.data.results.filter(r => 
      typeof r.value === 'string' && isNaN(parseFloat(r.value))
    );
    
    console.log(`\n✅ Found ${qualitativeParams.length} qualitative parameters:`);
    qualitativeParams.slice(0, 5).forEach(r => {
      console.log(`   - ${r.parameterName}: "${r.value}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testQualitativeValues();
