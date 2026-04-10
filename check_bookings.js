const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { status: 'confirmed' },
      select: {
        appointmentDate: true,
        patient: { select: { name: true } },
        doctor: { select: { name: true } }
      },
      orderBy: { appointmentDate: 'asc' }
    });

    console.log('CONFIRMED APPOINTMENTS: ' + appointments.length);
    appointments.forEach((apt, i) => {
      const d = new Date(apt.appointmentDate);
      console.log((i+1) + '. ' + apt.patient.name + ' - ' + d.toDateString() + ' - Dr.' + apt.doctor.name);
    });
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
