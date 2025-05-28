const cron = require('node-cron');

// Schedule cleanup function to run at 12:00 PM and 12:00 AM daily
const scheduleCleanupTasks = () => {
  console.log('Setting up scheduled cleanup tasks...');

  // Schedule for 12:00 PM (noon) daily
  cron.schedule('0 12 * * *', async () => {
    console.log('Running scheduled cleanup at 12:00 PM...');
    try {
      const { cleanAndResetAvailableSpots } = require('../controllers/classController');
      const result = await cleanAndResetAvailableSpots();
      console.log('Scheduled cleanup at 12:00 PM completed:', result);
    } catch (error) {
      console.error('Error in scheduled cleanup at 12:00 PM:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Colombo" // Sri Lanka timezone
  });

  // Schedule for 12:00 AM (midnight) daily
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled cleanup at 12:00 AM...');
    try {
      const { cleanAndResetAvailableSpots } = require('../controllers/classController');
      const result = await cleanAndResetAvailableSpots();
      console.log('Scheduled cleanup at 12:00 AM completed:', result);
    } catch (error) {
      console.error('Error in scheduled cleanup at 12:00 AM:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Colombo" // Sri Lanka timezone
  });

  console.log('Scheduled cleanup tasks set up successfully');
  console.log('- Daily cleanup at 12:00 PM (noon)');
  console.log('- Daily cleanup at 12:00 AM (midnight)');
};

module.exports = {
  scheduleCleanupTasks
};
