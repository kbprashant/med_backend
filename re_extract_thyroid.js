const { PrismaClient } = require('@prisma/client');
const extractor = require('./services/smartMedicalExtractor');

const prisma = new PrismaClient();

async function reExtractThyroidReports() {
  try {
    console.log('\n🔄 Re-extracting all Thyroid reports with updated extractor...\n');
    
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Find all thyroid reports
    const thyroidReports = await prisma.report.findMany({
      where: {
        OR: [
          { testType: { contains: 'Thyroid', mode: 'insensitive' } },
          { testType: { contains: 'T3', mode: 'insensitive' } },
          { testType: { contains: 'T4', mode: 'insensitive' } },
          { testType: { contains: 'TSH', mode: 'insensitive' } }
        ]
      },
      orderBy: { reportDate: 'desc' },
      include: {
        testResults: true
      }
    });

    if (thyroidReports.length === 0) {
      console.log('❌ No thyroid reports found');
      return;
    }

    console.log(`\n📋 Found ${thyroidReports.length} Thyroid Report(s)\n`);

    let totalBefore = 0;
    let totalAfter = 0;

    for (const report of thyroidReports) {
      console.log(`📋 Processing: ${report.testType}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Current parameters: ${report.testResults.length}`);
      
      if (!report.ocrText) {
        console.log(`   ⚠️  No OCR text - skipping\n`);
        continue;
      }

      totalBefore += report.testResults.length;

      // Run extraction
      console.log(`\n🔬 Running smart extraction...`);
      const result = extractor.extract(report.ocrText);

      if (!result.success || result.parameters.length === 0) {
        console.log(`   ❌ Extraction failed - skipping\n`);
        continue;
      }

      console.log(`\n✅ Extracted ${result.parameters.length} parameters (raw)\n`);

      // Delete old test results
      console.log('🗑️  Deleting old test results...');
      const deleteResult = await prisma.testResult.deleteMany({
        where: { reportId: report.id }
      });
      console.log(`   Deleted ${deleteResult.count} old results\n`);

      // Save new test results
      console.log('💾 Saving new test results...\n');
      
      for (const param of result.parameters) {
        const testResult = await prisma.testResult.create({
          data: {
            reportId: report.id,
            testCategory: report.category,
            testSubCategory: report.subcategory,
            testName: report.testType,
            parameterName: param.parameter,
            value: String(param.value), // Convert to string for Prisma
            unit: param.unit || '',
            status: 'NORMAL',
            testDate: report.reportDate
          }
        });
        
        console.log(`   ✅ ${param.parameter}: ${param.value} ${param.unit}`);
      }

      totalAfter += result.parameters.length;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ Re-extracted: ${report.testType}`);
      console.log(`   Before: ${report.testResults.length} parameters`);
      console.log(`   After: ${result.parameters.length} parameters`);
      console.log(`   Change: ${result.parameters.length - report.testResults.length >= 0 ? '+' : ''}${result.parameters.length - report.testResults.length} parameters`);
      console.log(`${'='.repeat(80)}\n`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL THYROID REPORTS RE-EXTRACTED');
    console.log(`   Total Reports: ${thyroidReports.length}`);
    console.log(`   Before: ${totalBefore} total parameters`);
    console.log(`   After: ${totalAfter} total parameters`);
    console.log(`   Improvement: ${totalAfter - totalBefore >= 0 ? '+' : ''}${totalAfter - totalBefore} parameters`);
    console.log('='.repeat(80));
    console.log('\n💡 Now refresh your app to see the corrected Thyroid parameters!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('📤 Database disconnected');
  }
}

reExtractThyroidReports();
