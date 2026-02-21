const addHistory = (task, user, action, description, field = null, oldValue = null, newValue = null) => {
  const historyEntry = {
    user: user._id,
    userName: user.name,
    action,
    description,
    field,
    oldValue,
    newValue,
    createdAt: new Date()
  };

  task.history.push(historyEntry);
};

const getStatusLabel = (status) => {
  const labels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done'
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

module.exports = {
  addHistory,
  getStatusLabel,
  getPriorityLabel,
  formatDate
};