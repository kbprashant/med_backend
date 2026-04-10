#!/usr/bin/env node

/**
 * Diagnostic Script - Check Live Queue Query
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseQueue() {
  try {
    console.log('🔍 LIVE QUEUE DIAGNOSTIC\n');

    // Get Kavi's information
    const kavi = await prisma.doctor.findUnique({
      where: { email: 'm.kavipriya1309@gmail.com' },
      select: { id: true, name: true, email: true }
    });

    console.log('👨‍⚕️  Doctor Found:');
    console.log(`  Name: ${kavi.name}`);
    console.log(`  ID: ${kavi.id}`);
    console.log(`  Email: ${kavi.email}\n`);

    // Get all appointments to find their date
    const allAppointments = await prisma.appointment.findMany({
      where: { doctorId: kavi.id },
      include: { patient: { select: { name: true } } }
    });

    console.log(`📊 ALL Appointments for ${kavi.name}:`);
    if (allAppointments.length === 0) {
      console.log('  ❌ No appointments found!\n');
    } else {
      for (const apt of allAppointments) {
        console.log(`  - ${apt.patient.name}`);
        console.log(`    Appointment Date (DB): ${apt.appointmentDate}`);
        console.log(`    Time: ${apt.bookingTime}`);
        console.log(`    Status: ${apt.status}\n`);
      }
    }

    // Test the query with the actual appointment date
    if (allAppointments.length > 0) {
      const appointmentDate = allAppointments[0].appointmentDate;
      
      // Convert to YYYY-MM-DD format
      const year = appointmentDate.getFullYear();
      const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log(`\n🧪 Testing Query with Date: ${dateStr}\n`);
      
      // Simulate the backend's new date parsing logic
      const dateParts = dateStr.split('-');
      const queryYear = parseInt(dateParts[0]);
      const queryMonth = parseInt(dateParts[1]) - 1;
      const queryDay = parseInt(dateParts[2]);
      
      const targetDate = new Date(queryYear, queryMonth, queryDay, 0, 0, 0, 0);
      const tomorrow = new Date(targetDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      console.log(`  Target Date: ${targetDate.toISOString()}`);
      console.log(`  Tomorrow: ${tomorrow.toISOString()}\n`);
      
      // Query with the corrected parameters
      const results = await prisma.appointment.findMany({
        where: {
          doctorId: kavi.id,
          appointmentDate: {
            gte: targetDate,
            lt: tomorrow
          },
          status: {
            in: ['pending', 'confirmed']
          }
        },
        include: { patient: { select: { name: true } } }
      });
      
      console.log(`✅ Query Results: Found ${results.length} appointments\n`);
      if (results.length > 0) {
        for (const apt of results) {
          console.log(`  ✔️  ${apt.patient.name} at ${apt.bookingTime} (Status: ${apt.status})`);
        }
      }
    }

    console.log('\n✅ Diagnostic complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseQueue();
