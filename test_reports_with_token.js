const http = require('http');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find Aurora
    const aurora = await prisma.user.findUnique({
      where: { email: 'aurorakp07@gmail.com' }
    });

    if (!aurora) {
      console.log('❌ Aurora user not found');
      process.exit(1);
    }

    console.log('✅ Found Aurora user');

    // Create a test JWT token (same format as backend)
    const token = jwt.sign(
      { id: aurora.id, email: aurora.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    console.log(`\n✅ Generated test token: ${token.substring(0, 50)}...`);
    console.log(`   For user: ${aurora.email}`);

    // Test API call with token
    console.log('\n🔍 Testing /api/reports with token...');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`\n📊 Response:`);
          
          if (parsed.reports) {
            console.log(`   Total Reports: ${parsed.reports.length}`);
            if (parsed.reports.length > 0) {
              parsed.reports.slice(0, 3).forEach((r, i) => {
                console.log(`   ${i + 1}. ${r.testType} (${r.id.substring(0, 8)}...)`);
              });
              if (parsed.reports.length > 3) {
                console.log(`   ... and ${parsed.reports.length - 3} more`);
              }
            }
          } else {
            console.log('   Note: No "reports" key in response');
            console.log('   Full response:', JSON.stringify(parsed, null, 2));
          }
        } catch {
          console.log('Raw response:', data);
        }
        
        process.exit(0);
      });
    });

    req.on('error', (e) => {
      console.error('❌ Error:', e.message);
      process.exit(1);
    });

    req.end();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
