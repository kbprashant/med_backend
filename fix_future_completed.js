const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFutureCompletedAppointments() {
  try {
    const now = new Date();
    console.log(`Current date/time: ${now.toISOString()}`);

    // Find all completed appointments with future dates
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'completed',
        appointmentDate: {
          gte: now // Future dates
        }
      }
    });

    console.log(`Found ${appointments.length} future appointments marked as completed:`);
    appointments.forEach(apt => {
      console.log(`  - ID: ${apt.id}, Date: ${apt.appointmentDate}, Status: ${apt.status}`);
    });

    if (appointments.length > 0) {
      // Update them to 'confirmed' instead
      const updated = await prisma.appointment.updateMany({
        where: {
          status: 'completed',
          appointmentDate: {
            gte: now
          }
        },
        data: {
          status: 'confirmed'
        }
      });

      console.log(`\n✅ Updated ${updated.count} appointments from 'completed' to 'confirmed'`);
    } else {
      console.log('✅ No future completed appointments found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFutureCompletedAppointments();
