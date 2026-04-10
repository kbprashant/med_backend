const http = require('http');

// Get Aurora's user ID from database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find Aurora
    const aurora = await prisma.user.findUnique({
      where: { email: 'aurorakp07@gmail.com' },
      include: { reports: true }
    });

    if (!aurora) {
      console.log('❌ Aurora user not found');
      process.exit(1);
    }

    console.log('✅ Found Aurora:');
    console.log(`   ID: ${aurora.id}`);
    console.log(`   Email: ${aurora.email}`);
    console.log(`   Reports: ${aurora.reports.length}`);

    // Make API call to /reports endpoint
    console.log('\n🔍 Testing /api/reports endpoint...');
    console.log('URL: http://localhost:5000/api/reports');

    // We would need to get a valid token - for now just test the endpoint structure
    const testUrl = 'http://localhost:5000/api/reports';
    const req = http.get(testUrl, (res) => {
      console.log(`Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(parsed, null, 2));
          process.exit(0);
        } catch {
          console.log('Response (raw):', data);
          process.exit(1);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Error:', e.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
