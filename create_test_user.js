require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Creating Test User ===\n');
    
    // Test user credentials
    const phoneNumber = '1234567890';
    const password = 'password123';
    const email = 'test@example.com';
    const name = 'Test User';
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: phoneNumber },
          { email: email }
        ]
      }
    });
    
    if (existingUser) {
      console.log('User already exists:', {
        phoneNumber: existingUser.phoneNumber,
        email: existingUser.email,
        name: existingUser.name,
        isVerified: existingUser.isVerified
      });
      console.log('\nTo test login, use:');
      console.log('  Phone: 1234567890');
      console.log('  Password: password123');
      await prisma.$disconnect();
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        passwordHash: passwordHash,
        isVerified: true, // Set to true for easy testing
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log({
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified
    });
    
    console.log('\n📱 Test Login Credentials:');
    console.log('  Phone: 1234567890');
    console.log('  Password: password123');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
