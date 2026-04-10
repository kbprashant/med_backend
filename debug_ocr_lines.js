const prisma = require('./config/database');
const smartExtractor = require('./services/smartMedicalExtractor');

async function debug() {
  try {
    const report = await prisma.report.findFirst({
      where: { testType: 'Complete Blood Count' },
      orderBy: { reportDate: 'desc' }
    });
    
    if (!report || !report.ocrText) {
      console.log('No CBC report with OCR text found');
      return;
    }

    console.log('ORIGINAL OCR TEXT:');
    console.log('='.repeat(80));
    const lines = report.ocrText.split('\n').slice(0, 30);
    lines.forEach((line, idx) => {
      console.log(`${(idx+1).toString().padStart(3)}: "${line}"`);
    });

    console.log('\n\nNORMALIZED TEXT:');
    console.log('='.repeat(80));
    const normalized = smartExtractor.normalizeText(report.ocrText);
    const normLines = normalized.split('\n').slice(0, 30);
    normLines.forEach((line, idx) => {
      console.log(`${(idx+1).toString().padStart(3)}: "${line}"`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();
