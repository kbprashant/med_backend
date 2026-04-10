const prisma = require('./config/database');
const smartExtractor = require('./services/smartMedicalExtractor');

async function debugKFT() {
  try {
    const kftReport = await prisma.report.findFirst({
      where: { 
        OR: [
          { testType: { contains: 'KFT' } },
          { testType: { contains: 'Kidney Function' } }
        ]
      },
      orderBy: { reportDate: 'desc' }
    });
    
    if (!kftReport || !kftReport.ocrText) {
      console.log('No KFT report found');
      return;
    }

    const text = kftReport.ocrText;
    console.log('OCR TEXT (first 800 chars):');
    console.log('='.repeat(80));
    console.log(text.substring(0, 800));
    console.log('='.repeat(80));

    console.log('\nCHECKING STRUCTURED DETECTION:');
    const normalized = smartExtractor.normalizeText(text);
    const isStructured = smartExtractor.isStructuredReport(normalized);
    console.log(`isStructuredReport: ${isStructured}`);

    const isTableRow = smartExtractor.isTableRowFormat(normalized);
    console.log(`isTableRowFormat: ${isTableRow}`);

    console.log('\nSEARCHING FOR KEYWORDS IN TEXT:');
    const lines = normalized.split('\n');
    const keywordLines = lines.filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('urea') || lower.includes('creatinine') || 
             lower.includes('uric acid') || lower.includes('calcium') ||
             lower.includes('sodium') || lower.includes('potassium');
    });
    console.log('Found keyword lines:', keywordLines.length);
    keywordLines.forEach((line, idx) => {
      console.log(`  ${idx+1}. "${line}"`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugKFT();
