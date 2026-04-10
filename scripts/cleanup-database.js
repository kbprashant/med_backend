#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Deletes all records from all tables while preserving table structure
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('');

    // Delete in order of dependencies (respecting foreign key constraints)
    
    console.log('  Deleting notifications...');
    const notificationsDeleted = await prisma.notification.deleteMany({});
    console.log(`    ✅ Deleted ${notificationsDeleted.count} notification records`);

    console.log('  Deleting appointments...');
    const appointmentsDeleted = await prisma.appointment.deleteMany({});
    console.log(`    ✅ Deleted ${appointmentsDeleted.count} appointment records`);

    console.log('  Deleting health summaries...');
    const healthSummariesDeleted = await prisma.healthSummary.deleteMany({});
    console.log(`    ✅ Deleted ${healthSummariesDeleted.count} health summary records`);

    console.log('  Deleting test results...');
    const testResultsDeleted = await prisma.testResult.deleteMany({});
    console.log(`    ✅ Deleted ${testResultsDeleted.count} test result records`);

    console.log('  Deleting reports...');
    const reportsDeleted = await prisma.report.deleteMany({});
    console.log(`    ✅ Deleted ${reportsDeleted.count} report records`);

    console.log('  Deleting doctor schedules...');
    const doctorSchedulesDeleted = await prisma.doctorSchedule.deleteMany({});
    console.log(`    ✅ Deleted ${doctorSchedulesDeleted.count} doctor schedule records`);

    console.log('  Deleting lab centers...');
    const labCentersDeleted = await prisma.labCenter.deleteMany({});
    console.log(`    ✅ Deleted ${labCentersDeleted.count} lab center records`);

    console.log('  Deleting test parameters...');
    const testParametersDeleted = await prisma.testParameter.deleteMany({});
    console.log(`    ✅ Deleted ${testParametersDeleted.count} test parameter records`);

    console.log('  Deleting test definitions...');
    const testDefinitionsDeleted = await prisma.testDefinition.deleteMany({});
    console.log(`    ✅ Deleted ${testDefinitionsDeleted.count} test definition records`);

    console.log('  Deleting test masters...');
    const testMastersDeleted = await prisma.testMaster.deleteMany({});
    console.log(`    ✅ Deleted ${testMastersDeleted.count} test master records`);

    console.log('  Deleting doctor OTP verifications...');
    const doctorOtpDeleted = await prisma.doctorOtpVerification.deleteMany({});
    console.log(`    ✅ Deleted ${doctorOtpDeleted.count} doctor OTP verification records`);

    console.log('  Deleting doctors...');
    const doctorsDeleted = await prisma.doctor.deleteMany({});
    console.log(`    ✅ Deleted ${doctorsDeleted.count} doctor records`);

    console.log('  Deleting OTP verifications...');
    const otpDeleted = await prisma.otpVerification.deleteMany({});
    console.log(`    ✅ Deleted ${otpDeleted.count} OTP verification records`);

    console.log('  Deleting users...');
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`    ✅ Deleted ${usersDeleted.count} user records`);

    console.log('');
    console.log('✅ Database cleanup completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Users: ${usersDeleted.count}`);
    console.log(`   - Doctors: ${doctorsDeleted.count}`);
    console.log(`   - Appointments: ${appointmentsDeleted.count}`);
    console.log(`   - Reports: ${reportsDeleted.count}`);
    console.log(`   - All other records cleaned up`);
    console.log('');
    console.log('✨ Database is ready for new records!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDatabase();
