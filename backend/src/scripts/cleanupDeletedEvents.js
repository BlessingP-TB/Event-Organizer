// Run this script periodically (e.g., with a cron job) to permanently delete events soft-deleted for over 24 hours
const { prisma } = require('../utils/index.util');
const { cleanupDeletedEvents } = require('../services/event.service');

(async () => {
  try {
    await cleanupDeletedEvents();
    console.log('Old deleted events cleaned up.');
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
