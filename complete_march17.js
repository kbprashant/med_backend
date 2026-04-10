const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Update March 17 specifically
    const updated = await prisma.appointment.updateMany({
      where: {
        appointmentDate: {
          lt: new Date('2026-03-18')
        },
        status: 'confirmed'
      },
      data: {
        status: 'completed'
      }
    });

    console.log('✅ Updated ' + updated.count + ' more appointments to COMPLETED');
    console.log('   - March 17 appointment');
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
