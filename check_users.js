require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking Users ===\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        name: true,
      }
    });
    
    console.log('Found', users.length, 'users:');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
