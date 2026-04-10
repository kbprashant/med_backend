const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportId = 'f6d80108-c8b3-429d-8a05-822c325362ca';
    
    await prisma.report.delete({
      where: { id: reportId },
    });
    
    console.log('✅ Deleted bad blood test report');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
