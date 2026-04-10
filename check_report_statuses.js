/**
 * Check Report Status - View all thyroid reports with their test results
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReportStatuses() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 CHECKING THYROID REPORT STATUSES');
  console.log('='.repeat(70) + '\n');

  try {
    // Find all reports that have thyroid test results
    const reports = await prisma.report.findMany({
      where: {
        testResults: {
          some: {
            parameterName: {
              in: ['FT3', 'FT4', 'TSH', 'T3 Total', 'T4 Total']
            }
          }
        }
      },
      include: {
        testResults: {
          where: {
            parameterName: {
              in: ['FT3', 'FT4', 'TSH', 'T3 Total', 'T4 Total']
            }
          },
          orderBy: {
            parameterName: 'asc'
          }
        }
      },
      orderBy: {
        reportDate: 'desc'
      }
    });

    console.log(`Found ${reports.length} thyroid reports:\n`);

    reports.forEach((report, i) => {
      console.log(`${i + 1}. Report ID: ${report.id}`);
      console.log(`   Date: ${report.reportDate.toLocaleDateString()}`);
      console.log(`   Test Type: ${report.testType}`);
      console.log(`   Parameters (${report.testResults.length}):`);
      
      let normalCount = 0;
      let abnormalCount = 0;
      
      report.testResults.forEach(result => {
        const statusEmoji = result.status === 'NORMAL' ? '✅' : 
                           result.status === 'HIGH' ? '⬆️' : '⬇️';
        console.log(`      ${statusEmoji} ${result.parameterName}: ${result.value} ${result.unit} [${result.status}]`);
        
        if (result.status === 'NORMAL') {
          normalCount++;
        } else {
          abnormalCount++;
        }
      });
      
      const calculatedStatus = abnormalCount === 0 ? 'Normal' : 'Attention Needed';
      console.log(`   Calculated Overall Status: ${calculatedStatus} (${normalCount}/${report.testResults.length} normal)`);
      console.log('');
    });

    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReportStatuses();
