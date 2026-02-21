const Task = require('../models/Task');
const User = require('../models/User');
const { sendDueDateReminder } = require('./emailService');
const { checkAndGenerateRecurringTasks } = require('./recurrenceService');

const checkDueTasks = async () => {
  try {
    console.log('Checking for due tasks...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const dueTasks = await Task.find({
      status: { $ne: 'done' },
      dueDate: {
        $lte: threeDaysFromNow,
      },
    }).populate('user');

    console.log(`Found ${dueTasks.length} tasks due soon`);

    for (const task of dueTasks) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate - today;
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 3) {
        try {
          await sendDueDateReminder(task.user, task, daysUntilDue);
          console.log(`Sent notification for task: ${task.title} (due in ${daysUntilDue} days)`);
        } catch (error) {
          console.error(`Failed to send notification for task ${task._id}:`, error);
        }
      }
    }
    
    // Check and generate recurring tasks
    await checkAndGenerateRecurringTasks();
    
  } catch (error) {
    console.error('Error checking due tasks:', error);
  }
};

const startNotificationScheduler = () => {
  console.log('Starting notification scheduler...');
  
  checkDueTasks();
  
  setInterval(checkDueTasks, 60 * 60 * 1000); // 1 hour
};

module.exports = {
  startNotificationScheduler,
  checkDueTasks,
};