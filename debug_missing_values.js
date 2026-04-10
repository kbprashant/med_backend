const prisma = require('./config/database');

async function debugValues() {
  try {
    const report = await prisma.report.findFirst({
      where: { testType: 'Complete Blood Count' },
      orderBy: { reportDate: 'desc' }
    });
    
    if (!report) return;

    console.log('SEARCHING FOR: 40.80 and 52.40\n');
   console.log('OCR TEXT:');
    console.log('='.repeat(80));
    const lines = report.ocrText.split('\n');
    
    lines.forEach((line, idx) => {
      if (line.includes('40') || line.includes('52') || line.includes('Results') || line.includes('Gender')) {
        console.log(`Line ${(idx+1).toString().padStart(3)}: "${line}"`);
      }
    });

    console.log('\n\nALL LINES AROUND "Results":');
    lines.forEach((line, idx) => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('result') || idx >= 50 && idx <= 75) {
        console.log(`Line ${(idx+1).toString().padStart(3)}: "${line}"`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugValues();
