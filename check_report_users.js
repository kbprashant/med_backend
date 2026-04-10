const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking Reports and Their Users ===\n');
    
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found', reports.length, 'reports:');
    reports.forEach((report, index) => {
      console.log(`\n${index + 1}. Report ID: ${report.id}`);
      console.log(`   Test Type: ${report.testType}`);
      console.log(`   Report Date: ${report.reportDate}`);
      console.log(`   User ID: ${report.userId}`);
      if (report.user) {
        console.log(`   User Name: ${report.user.name}`);
        console.log(`   User Email: ${report.user.email}`);
      } else {
        console.log('   User: NOT FOUND (orphaned report)');
      }
    });
    
    console.log('\n=== Checking All Users ===\n');
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { reports: true }
        }
      }
    });
    
    console.log('Found', users.length, 'users:');
    users.forEach((user) => {
      console.log(`\nUser: ${user.name} (${user.email})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Phone: ${user.phoneNumber}`);
      console.log(`  Reports: ${user._count.reports}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
