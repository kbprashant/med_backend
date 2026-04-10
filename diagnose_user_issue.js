require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * This script helps diagnose the foreign key constraint issue
 * by checking if users exist in the database
 */
(async () => {
  try {
    console.log('🔍 Diagnosing Foreign Key Constraint Issue\n');
    console.log('='.repeat(50));
    
    // Check total users
    const userCount = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('\n❌ No users found in database!');
      console.log('\n💡 Solution:');
      console.log('   Run: node create_test_user.js');
      console.log('   Then log in with:');
      console.log('     Phone: 1234567890');
      console.log('     Password: password123');
    } else {
      console.log('\n✅ Users exist. Listing all users:\n');
      
      const users = await prisma.user.findMany({
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Phone: ${user.phoneNumber}`);
        console.log(`  Email: ${user.email || 'N/A'}`);
        console.log(`  Name: ${user.name || 'N/A'}`);
        console.log(`  Verified: ${user.isVerified ? '✅' : '❌'}`);
        console.log(`  Created: ${user.createdAt.toLocaleString()}`);
        console.log();
      });
      
      // Check reports
      const reportCount = await prisma.report.count();
      console.log(`📄 Total reports: ${reportCount}`);
      
      // Check for orphaned reports (shouldn't exist, but let's check)
      const reports = await prisma.report.findMany({
        select: {
          id: true,
          userId: true,
          testType: true,
        },
        take: 5
      });
      
      if (reports.length > 0) {
        console.log('\nRecent reports:');
        reports.forEach((report, index) => {
          console.log(`  Report ${index + 1}: UserID=${report.userId}, Type=${report.testType}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 If you\'re logged in but getting foreign key error:');
    console.log('   1. Check which user ID your app is using (check JWT token)');
    console.log('   2. Make sure that user ID exists in the list above');
    console.log('   3. If not, log out and log in again');
    console.log('   4. Or create a new user with: node create_test_user.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
