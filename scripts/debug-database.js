#!/usr/bin/env node

/**
 * Database Debug Script
 * Check all doctors and their appointments
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('🔍 DATABASE DEBUG INFO\n');

    // Get all doctors
    const doctors = await prisma.doctor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      }
    });

    console.log('👨‍⚕️  DOCTORS IN DATABASE:');
    if (doctors.length === 0) {
      console.log('  ❌ No doctors found!\n');
    } else {
      for (const doctor of doctors) {
        console.log(`\n  Doctor: ${doctor.name}`);
        console.log(`    ID: ${doctor.id}`);
        console.log(`    Email: ${doctor.email}`);
        console.log(`    Phone: ${doctor.phoneNumber}`);
      }
    }

    // Get all patients (users)
    const patients = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      }
    });

    console.log('\n\n👥 PATIENTS IN DATABASE:');
    if (patients.length === 0) {
      console.log('  ❌ No patients found!\n');
    } else {
      for (const patient of patients) {
        console.log(`\n  Patient: ${patient.name}`);
        console.log(`    ID: ${patient.id}`);
        console.log(`    Email: ${patient.email}`);
        console.log(`    Phone: ${patient.phoneNumber}`);
      }
    }

    // Get all appointments with details
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: {
          select: { id: true, name: true, email: true }
        },
        doctor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { appointmentDate: 'desc' }
    });

    console.log('\n\n📅 APPOINTMENTS IN DATABASE:');
    if (appointments.length === 0) {
      console.log('  ❌ No appointments found!\n');
    } else {
      for (const apt of appointments) {
        console.log(`\n  Appointment ID: ${apt.id}`);
        console.log(`    Patient: ${apt.patient.name} (${apt.patient.email})`);
        console.log(`    Doctor: ${apt.doctor.name} (${apt.doctor.email})`);
        console.log(`    Date: ${apt.appointmentDate.toISOString().split('T')[0]}`);
        console.log(`    Time: ${apt.bookingTime}`);
        console.log(`    Status: ${apt.status}`);
        console.log(`    Queue #: ${apt.queueNumber}`);
      }
    }

    console.log('\n\n📊 SUMMARY:');
    console.log(`  Total Doctors: ${doctors.length}`);
    console.log(`  Total Patients: ${patients.length}`);
    console.log(`  Total Appointments: ${appointments.length}`);

    if (doctors.length > 0 && patients.length > 0 && appointments.length === 0) {
      console.log('\n⚠️  You have doctors and patients, but NO APPOINTMENTS!');
      console.log('    Please create an appointment via the app.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
