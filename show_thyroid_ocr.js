const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showThyroidOCR() {
  try {
    console.log('\n📄 Fetching Thyroid OCR text...\n');
    
    await prisma.$connect();
    
    const thyroidReport = await prisma.report.findFirst({
      where: {
        OR: [
          { testType: { contains: 'Thyroid', mode: 'insensitive' } }
        ]
      },
      orderBy: { reportDate: 'desc' }
    });

    if (!thyroidReport) {
      console.log('❌ No Thyroid report found');
      return;
    }

    console.log('📋 Thyroid Report:', thyroidReport.testType);
    console.log('   ID:', thyroidReport.id);
    console.log('\n' + '='.repeat(80));
    console.log('OCR TEXT:');
    console.log('='.repeat(80));
    
    // Show OCR text with line numbers
    const lines = thyroidReport.ocrText.split('\n');
    lines.forEach((line, idx) => {
      console.log(`${String(idx + 1).padStart(3)}: ${line}`);
    });
    
    console.log('='.repeat(80));
    console.log(`Total lines: ${lines.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showThyroidOCR();
