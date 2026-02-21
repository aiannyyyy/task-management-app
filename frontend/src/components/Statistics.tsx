import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Task } from '../types/task';

interface StatisticsProps {
  tasks: Task[];
  onClose: () => void;
}

const Statistics: React.FC<StatisticsProps> = ({ tasks, onClose }) => {
  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Status distribution
  const statusData = [
    { name: 'To Do', value: todoTasks, color: '#9CA3AF' },
    { name: 'In Progress', value: inProgressTasks, color: '#3B82F6' },
    { name: 'Done', value: completedTasks, color: '#10B981' },
  ];

  // Priority distribution
  const priorityData = [
    {
      name: 'Priority',
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    },
  ];

  // Category distribution
  const categoryData = [
    { name: 'Work', value: tasks.filter(t => t.category === 'work').length },
    { name: 'Personal', value: tasks.filter(t => t.category === 'personal').length },
    { name: 'Shopping', value: tasks.filter(t => t.category === 'shopping').length },
    { name: 'Health', value: tasks.filter(t => t.category === 'health').length },
    { name: 'Other', value: tasks.filter(t => t.category === 'other').length },
  ].filter(item => item.value > 0);

  // Tasks created over time (last 7 days)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7Days = getLast7Days();
  const tasksOverTime = last7Days.map(day => {
    const dayTasks = tasks.filter(t => {
      if (!t.createdAt) return false;
      const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
      return taskDate === day;
    });
    return {
      date: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created: dayTasks.length,
      completed: dayTasks.filter(t => t.status === 'done').length,
    };
  });

  // Overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  // Tasks with subtasks
  const tasksWithSubtasks = tasks.filter(t => t.subtasks && t.subtasks.length > 0);
  const totalSubtasks = tasksWithSubtasks.reduce((sum, t) => sum + t.subtasks.length, 0);
  const completedSubtasks = tasksWithSubtasks.reduce(
    (sum, t) => sum + t.subtasks.filter(st => st.completed).length,
    0
  );
  const subtaskCompletionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Statistics Dashboard</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your productivity insights at a glance</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalTasks}</p>
                </div>
                <span className="text-4xl">📋</span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{completedTasks}</p>
                </div>
                <span className="text-4xl">✅</span>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Completion Rate</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{completionRate}%</p>
                </div>
                <span className="text-4xl">📈</span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">{overdueTasks}</p>
                </div>
                <span className="text-4xl">⏰</span>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => {
                      const { name, percent } = entry;
                      return `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="high" fill="#EF4444" name="High" />
                  <Bar dataKey="medium" fill="#F59E0B" name="Medium" />
                  <Bar dataKey="low" fill="#10B981" name="Low" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks Over Time */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks Created (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tasksOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#3B82F6" name="Created" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completed" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks with Comments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {tasks.filter(t => t.comments && t.comments.length > 0).length}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tasks with Attachments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {tasks.filter(t => t.attachments && t.attachments.length > 0).length}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Subtask Completion</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks} (${subtaskCompletionRate}%)` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Statistics;