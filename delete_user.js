const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        email: 'aurorakp07@gmail.com'
      }
    });
    console.log(`✅ Deleted ${result.count} user(s)`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
