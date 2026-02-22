const Task = require('../models/Task');
const { addHistory } = require('../utils/taskHistory');

const shouldCreateNextRecurrence = (task) => {
  if (!task.isRecurring || task.recurringPattern === 'none') {
    return false;
  }

  // Don't create if task isn't completed
  if (task.status !== 'done') {
    return false;
  }

  // Check if we've already created the next occurrence
  const now = new Date();
  if (task.lastRecurredDate) {
    const lastRecurred = new Date(task.lastRecurredDate);
    const daysSince = Math.floor((now - lastRecurred) / (1000 * 60 * 60 * 24));
    
    if (daysSince < 1) {
      return false; // Already created today
    }
  }

  // Check if we've reached the end date
  if (task.recurringEndDate && new Date(task.recurringEndDate) < now) {
    return false;
  }

  return true;
};

const calculateNextDueDate = (currentDueDate, pattern, interval) => {
  if (!currentDueDate) {
    return null;
  }

  const nextDate = new Date(currentDueDate);

  switch (pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
  }

  return nextDate;
};

const createNextRecurrence = async (task) => {
  try {
    const nextDueDate = calculateNextDueDate(
      task.dueDate,
      task.recurringPattern,
      task.recurringInterval
    );

    const newTask = new Task({
      user: task.user,
      title: task.title,
      description: task.description,
      status: 'todo',
      priority: task.priority,
      category: task.category,
      labels: task.labels,
      dueDate: nextDueDate,
      isRecurring: task.isRecurring,
      recurringPattern: task.recurringPattern,
      recurringInterval: task.recurringInterval,
      recurringEndDate: task.recurringEndDate,
      parentTaskId: task.parentTaskId || task._id,
      // Don't copy these
      // attachments: [],
      // comments: [],
      // subtasks: [],
      // history: []
    });

    // Add creation history
    const user = await require('../models/User').findById(task.user);
    if (user) {
      addHistory(newTask, user, 'created', `Created recurring task (${task.recurringPattern})`);
    }

    await newTask.save();

    // Update the original task's lastRecurredDate
    task.lastRecurredDate = new Date();
    await task.save();

    console.log(`Created next recurrence for task: ${task.title}`);
    return newTask;
  } catch (error) {
    console.error('Error creating next recurrence:', error);
    throw error;
  }
};

const checkAndCreateRecurrences = async () => {
  try {
    console.log('Checking for recurring tasks...');

    const completedRecurringTasks = await Task.find({
      isRecurring: true,
      status: 'done',
      recurringPattern: { $ne: 'none' }
    }).populate('user');

    console.log(`Found ${completedRecurringTasks.length} completed recurring tasks`);

    for (const task of completedRecurringTasks) {
      if (shouldCreateNextRecurrence(task)) {
        try {
          await createNextRecurrence(task);
        } catch (error) {
          console.error(`Failed to create recurrence for task ${task._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking recurring tasks:', error);
  }
};

// Run check every hour
const startRecurringTaskScheduler = () => {
  console.log('Starting recurring task scheduler...');
  
  // Check immediately on start
  checkAndCreateRecurrences();
  
  // Then check every hour
  setInterval(checkAndCreateRecurrences, 60 * 60 * 1000); // 1 hour
};

module.exports = {
  shouldCreateNextRecurrence,
  calculateNextDueDate,
  createNextRecurrence,
  checkAndCreateRecurrences,
  startRecurringTaskScheduler
};