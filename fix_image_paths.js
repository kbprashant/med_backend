const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImagePaths() {
  try {
    const reports = await prisma.report.findMany({
      where: { category: 'Image Report' }
    });

    console.log(`Found ${reports.length} Image Reports`);

    for (const report of reports) {
      if (report.filePath && report.filePath.includes('uploads')) {
        // Convert Windows path to URL-friendly path
        const normalizedPath = report.filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/uploads/');
        const newPath = parts[1] ? `uploads/${parts[1]}` : report.filePath;

        await prisma.report.update({
          where: { id: report.id },
          data: { filePath: newPath }
        });

        console.log(`✅ Updated report ${report.id}`);
        console.log(`   Old: ${report.filePath}`);
        console.log(`   New: ${newPath}`);
      }
    }

    console.log('\n✅ All Image Report paths updated successfully!');
  } catch (error) {
    console.error('❌ Error fixing paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImagePaths();
