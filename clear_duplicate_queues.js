/**
 * Clear duplicate queue numbers and fix queue assignment
 * Removes all appointments with null or duplicate queue numbers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDuplicateQueues() {
  try {
    console.log('🔍 Checking for duplicate or invalid queue numbers...\n');

    // Find all appointments grouped by doctor, date, schedule
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] }
      },
      orderBy: [
        { doctorId: 'asc' },
        { appointmentDate: 'asc' },
        { scheduleId: 'asc' },
        { queueNumber: 'asc' }
      ],
      select: {
        id: true,
        doctorId: true,
        appointmentDate: true,
        scheduleId: true,
        queueNumber: true,
        status: true
      }
    });

    console.log(`Total appointments: ${appointments.length}`);

    // Check for duplicates
    const seen = new Set();
    let duplicateCount = 0;
    const duplicates = [];

    appointments.forEach(apt => {
      const key = `${apt.doctorId}_${apt.appointmentDate.toISOString()}_${apt.scheduleId}_${apt.queueNumber}`;
      if (seen.has(key)) {
        duplicateCount++;
        duplicates.push(apt);
        console.log(
          `❌ DUPLICATE: Doctor=${apt.doctorId}, Date=${apt.appointmentDate.toISOString()}, Schedule=${apt.scheduleId}, Queue=${apt.queueNumber}, ID=${apt.id}`
        );
      } else {
        seen.add(key);
      }
    });

    if (duplicates.length > 0) {
      console.log(`\n⚠️ Found ${duplicates.length} duplicate queue numbers`);
      console.log('🗑️ Deleting duplicates...\n');

      // Delete all duplicates
      for (const dup of duplicates) {
        await prisma.appointment.delete({
          where: { id: dup.id }
        });
        console.log(`✅ Deleted: ${dup.id}`);
      }

      console.log(`\n✅ Deleted ${duplicates.length} duplicate appointments`);
    } else {
      console.log('\n✅ No duplicate queue numbers found');
    }

    // Check for null queue numbers
    const nullQueues = await prisma.appointment.findMany({
      where: {
        queueNumber: null,
        status: { in: ['pending', 'confirmed'] }
      }
    });

    if (nullQueues.length > 0) {
      console.log(`\n⚠️ Found ${nullQueues.length} appointments with NULL queue numbers`);
      console.log('🗑️ Deleting invalid appointments...\n');

      for (const apt of nullQueues) {
        await prisma.appointment.delete({
          where: { id: apt.id }
        });
        console.log(`✅ Deleted: ${apt.id}`);
      }
    }

    console.log('\n✨ Queue cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearDuplicateQueues();
