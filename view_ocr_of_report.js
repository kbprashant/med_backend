const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: 'f6d80108-c8b3-429d-8a05-822c325362ca' },
    });
    
    console.log('OCR Text:\n');
    console.log(report.ocrText);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
})();
