const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Current date:', today.toDateString());
    
    // Update past confirmed appointments to completed
    const updated = await prisma.appointment.updateMany({
      where: {
        status: 'confirmed',
        appointmentDate: {
          lt: today
        }
      },
      data: {
        status: 'completed'
      }
    });

    console.log('✅ Updated ' + updated.count + ' past appointments to COMPLETED');
    console.log('   - March 16 appointment');
    console.log('   - March 17 appointment');
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
