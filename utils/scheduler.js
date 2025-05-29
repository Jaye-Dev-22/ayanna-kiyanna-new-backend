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

  // Schedule monitor validation for 3:00 AM daily
  cron.schedule('0 3 * * *', async () => {
    console.log('Running scheduled monitor validation at 3:00 AM...');
    try {
      const Class = require('../models/Class');
      const { confirmMonitors } = require('../controllers/classController');

      // Get all classes that have monitors
      const classesWithMonitors = await Class.find({
        monitors: { $exists: true, $not: { $size: 0 } }
      });

      console.log(`Found ${classesWithMonitors.length} classes with monitors to validate`);

      let totalClassesProcessed = 0;
      let totalMonitorsRemoved = 0;
      const validationReport = [];

      for (const classItem of classesWithMonitors) {
        try {
          // Create a mock request object for the confirmMonitors function
          const mockReq = { params: { id: classItem._id } };
          const result = await confirmMonitors(mockReq, null); // null for res since we're calling internally

          if (result && result.monitorsRemoved > 0) {
            totalMonitorsRemoved += result.monitorsRemoved;
            validationReport.push(result);
          }

          totalClassesProcessed++;
        } catch (error) {
          console.error(`Error validating monitors for class ${classItem._id}:`, error);
        }
      }

      const summary = {
        totalClassesProcessed,
        totalMonitorsRemoved,
        classesModified: validationReport.length,
        validationReport,
        timestamp: new Date().toISOString()
      };

      console.log('Scheduled monitor validation at 3:00 AM completed:', summary);
    } catch (error) {
      console.error('Error in scheduled monitor validation at 3:00 AM:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Colombo" // Sri Lanka timezone
  });

  console.log('Scheduled cleanup tasks set up successfully');
  console.log('- Daily cleanup at 12:00 PM (noon)');
  console.log('- Daily cleanup at 12:00 AM (midnight)');
  console.log('- Daily monitor validation at 3:00 AM');
};

module.exports = {
  scheduleCleanupTasks
};
