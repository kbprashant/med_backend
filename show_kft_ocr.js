const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showKFTOCR() {
  try {
    console.log('\n📄 Fetching KFT OCR text...\n');
    
    const kftReport = await prisma.report.findFirst({
      where: {
        OR: [
          { testType: { contains: 'KFT', mode: 'insensitive' } },
          { testType: { contains: 'Kidney', mode: 'insensitive' } }
        ]
      },
      orderBy: { reportDate: 'desc' }
    });

    if (!kftReport) {
      console.log('❌ No KFT report found');
      return;
    }

    console.log('📋 KFT Report:', kftReport.testType);
    console.log('   ID:', kftReport.id);
    console.log('\n' + '='.repeat(80));
    console.log('OCR TEXT:');
    console.log('='.repeat(80));
    
    // Show OCR text with line numbers
    const lines = kftReport.ocrText.split('\n');
    lines.forEach((line, idx) => {
      console.log(`${String(idx + 1).padStart(3)}: ${line}`);
    });
    
    console.log('='.repeat(80));
    console.log(`Total lines: ${lines.length}`);
    
    // Find the columnar structure
    console.log('\n' + '='.repeat(80));
    console.log('COLUMNAR STRUCTURE ANALYSIS:');
    console.log('='.repeat(80));
    
    const headerIdx = lines.findIndex(l => /investigation/i.test(l));
    if (headerIdx >= 0) {
      console.log(`\nHeader row (line ${headerIdx + 1}):`);
      console.log(lines[headerIdx]);
      
      // Show next 15 lines (the data rows)
      console.log('\nData rows:');
      for (let i = headerIdx + 1; i < Math.min(headerIdx + 16, lines.length); i++) {
        if (lines[i].trim()) {
          console.log(`  ${String(i + 1).padStart(3)}: ${lines[i]}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showKFTOCR();
