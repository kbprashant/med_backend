/**
 * Script to fix old appointments (set bookingTime for missing ones)
 * Run with: node scripts/fix_old_appointments.js
 */

const prisma = require('../config/database');

async function fixOldAppointments() {
  try {
    console.log('🔄 Starting to fix old appointments...\n');

    // Get all pending appointments without bookingTime
    const appointmentsToFix = await prisma.appointment.findMany({
      where: {
        bookingTime: null,
        status: 'pending'
      },
      include: {
        schedule: true
      }
    });

    console.log(`📋 Found ${appointmentsToFix.length} appointments without booking time\n`);

    if (appointmentsToFix.length === 0) {
      console.log('✅ No appointments to fix!');
      return;
    }

    // Helper function to generate time slots
    function generateTimeSlots(startTime, endTime) {
      const slots = [];
      const INTERVAL_MINUTES = 20;

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);

        const timeSlot = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
        slots.push(timeSlot);

        currentMinutes += INTERVAL_MINUTES;
      }

      return slots;
    }

    // Fix each appointment
    for (const apt of appointmentsToFix) {
      if (!apt.schedule) {
        console.log(`⚠️  Appointment ${apt.id}: No schedule found, skipping`);
        continue;
      }

      // Get first available slot
      const slots = generateTimeSlots(apt.schedule.startTime, apt.schedule.endTime);
      const firstSlot = slots[0] || '10:00 AM';

      await prisma.appointment.update({
        where: { id: apt.id },
        data: { bookingTime: firstSlot }
      });

      console.log(`✅ Updated ${apt.id.substring(0, 8)}... with time: ${firstSlot}`);
    }

    console.log(`\n✅ Fixed ${appointmentsToFix.length} appointments!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldAppointments();
