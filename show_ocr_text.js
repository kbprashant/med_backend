const prisma = require('./config/database');

async function showOcrText() {
  try {
    const report = await prisma.report.findFirst({
      where: { testType: 'Complete Blood Count' },
      orderBy: { reportDate: 'desc' }
    });
    
    if (report) {
      console.log('OCR TEXT:');
      console.log('='.repeat(80));
      console.log(report.ocrText);
      console.log('='.repeat(80));
    } else {
      console.log('No CBC report found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showOcrText();
