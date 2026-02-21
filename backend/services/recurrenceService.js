const Task = require('../models/Task');
const { addHistory } = require('../utils/taskHistory');

const getNextDueDate = (currentDueDate, recurrence) => {
  const nextDate = new Date(currentDueDate);
  
  switch (recurrence.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurrence.interval);
      break;
    
    case 'weekly':
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        // Find next day of week
        const currentDay = nextDate.getDay();
        const sortedDays = recurrence.daysOfWeek.sort((a, b) => a - b);
        
        let nextDay = sortedDays.find(day => day > currentDay);
        if (!nextDay) {
          nextDay = sortedDays[0];
          nextDate.setDate(nextDate.getDate() + 7);
        }
        
        const daysToAdd = (nextDay - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        nextDate.setDate(nextDate.getDate() + (7 * recurrence.interval));
      }
      break;
    
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + recurrence.interval);
      break;
    
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + recurrence.interval);
      break;
  }
  
  return nextDate;
};

const shouldGenerateNext = (task) => {
  if (!task.isRecurring || !task.recurrence || !task.dueDate) {
    return false;
  }
  
  // Check if task is completed
  if (task.status !== 'done') {
    return false;
  }
  
  // Check if recurrence has ended
  if (task.recurrence.endDate && new Date(task.recurrence.endDate) < new Date()) {
    return false;
  }
  
  // Check if next occurrence was already generated
  const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);
  if (task.recurrence.lastGenerated && new Date(task.recurrence.lastGenerated) >= nextDueDate) {
    return false;
  }
  
  return true;
};

const generateNextOccurrence = async (task, user) => {
  try {
    if (!shouldGenerateNext(task)) {
      return null;
    }
    
    const nextDueDate = getNextDueDate(task.dueDate, task.recurrence);
    
    // Create new task instance
    const newTask = new Task({
      user: task.user,
      title: task.title,
      description: task.description,
      status: 'todo',
      priority: task.priority,
      category: task.category,
      labels: task.labels,
      dueDate: nextDueDate,
      recurrence: task.recurrence,
      isRecurring: true,
      parentTask: task._id,
      subtasks: task.subtasks.map(st => ({
        text: st.text,
        completed: false
      }))
    });
    
    // Add history
    addHistory(newTask, user, 'created', `Created recurring task (from parent task)`);
    
    await newTask.save();
    
    // Update parent task's lastGenerated
    task.recurrence.lastGenerated = new Date();
    await task.save();
    
    console.log(`Generated next occurrence for task: ${task.title}`);
    return newTask;
  } catch (error) {
    console.error('Error generating next occurrence:', error);
    return null;
  }
};

const checkAndGenerateRecurringTasks = async () => {
  try {
    console.log('Checking for recurring tasks...');
    
    // Find completed recurring tasks
    const completedRecurringTasks = await Task.find({
      isRecurring: true,
      status: 'done',
      'recurrence.frequency': { $exists: true }
    }).populate('user');
    
    console.log(`Found ${completedRecurringTasks.length} completed recurring tasks`);
    
    for (const task of completedRecurringTasks) {
      if (shouldGenerateNext(task)) {
        await generateNextOccurrence(task, task.user);
      }
    }
  } catch (error) {
    console.error('Error checking recurring tasks:', error);
  }
};

module.exports = {
  getNextDueDate,
  shouldGenerateNext,
  generateNextOccurrence,
  checkAndGenerateRecurringTasks
};