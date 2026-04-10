const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const reportId = 'ef167d01-4458-4f91-a8f5-c78cc603a6ee';
    
    await prisma.report.delete({
      where: { id: reportId },
    });
    
    console.log('✅ Deleted bad thyroid report');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
