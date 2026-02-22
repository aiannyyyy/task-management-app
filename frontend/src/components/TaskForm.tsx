import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, TaskCategory, RecurringPattern } from '../types/task';
import { WorkspaceMember } from '../types/workspace';

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>, files?: File[]) => void;
  onCancel: () => void;
  workspaceMembers?: WorkspaceMember[];
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSubmit, onCancel, workspaceMembers = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    category: 'other' as TaskCategory,
    labels: [] as string[],
    attachments: [] as any[],
    comments: [] as any[],
    subtasks: [] as any[],
    history: [] as any[],
    dueDate: '',
    // Recurring fields
    isRecurring: false,
    recurringPattern: 'none' as RecurringPattern,
    recurringInterval: 1,
    recurringEndDate: '',
    // Team
    assignedTo: '',
  });
  const [newLabel, setNewLabel] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        category: task.category,
        labels: task.labels || [],
        attachments: task.attachments || [],
        comments: task.comments || [],
        subtasks: task.subtasks || [],
        history: task.history || [],
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        isRecurring: task.isRecurring || false,
        recurringPattern: task.recurringPattern || 'none',
        recurringInterval: task.recurringInterval || 1,
        recurringEndDate: task.recurringEndDate ? task.recurringEndDate.split('T')[0] : '',
        assignedTo: task.assignedTo ? ((task.assignedTo as any)?._id ?? task.assignedTo as string) : '',
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      category: formData.category,
      labels: formData.labels,
      attachments: formData.attachments,
      comments: [],
      subtasks: [],
      history: [],
      dueDate: formData.dueDate,
      isRecurring: formData.isRecurring,
      recurringPattern: formData.isRecurring ? formData.recurringPattern : 'none',
      recurringInterval: formData.recurringInterval,
      recurringEndDate: formData.recurringEndDate || undefined,
      assignedTo: formData.assignedTo || undefined,
    }, selectedFiles);

    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      category: 'other',
      labels: [],
      attachments: [],
      comments: [],
      subtasks: [],
      history: [],
      dueDate: '',
      isRecurring: false,
      recurringPattern: 'none',
      recurringInterval: 1,
      recurringEndDate: '',
      assignedTo: '',
    });
    setSelectedFiles([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleRecurringToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData({
      ...formData,
      isRecurring: checked,
      recurringPattern: checked ? 'weekly' : 'none',
    });
  };

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData({ ...formData, labels: [...formData.labels, newLabel.trim()] });
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setFormData({ ...formData, labels: formData.labels.filter(l => l !== labelToRemove) });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const categoryIcons: Record<TaskCategory, string> = {
    work: '💼', personal: '👤', shopping: '🛒', health: '🏥', other: '📌',
  };

  const patternLabels: Record<string, string> = {
    daily: 'Day(s)', weekly: 'Week(s)', monthly: 'Month(s)',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {task ? 'Edit Task' : 'Create New Task'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter task title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter task description"
          />
        </div>

        {/* Category & Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="work">{categoryIcons.work} Work</option>
              <option value="personal">{categoryIcons.personal} Personal</option>
              <option value="shopping">{categoryIcons.shopping} Shopping</option>
              <option value="health">{categoryIcons.health} Health</option>
              <option value="other">{categoryIcons.other} Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* ── Recurring Section ── */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                🔁 Recurring Task
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Automatically create a new task when this one is completed
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={handleRecurringToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Recurring options – only shown when toggled on */}
          {formData.isRecurring && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Pattern */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repeat
                </label>
                <select
                  name="recurringPattern"
                  value={formData.recurringPattern}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="recurringInterval"
                    value={formData.recurringInterval}
                    onChange={handleChange}
                    min={1}
                    max={365}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {patternLabels[formData.recurringPattern] ?? 'Unit(s)'}
                  </span>
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  name="recurringEndDate"
                  value={formData.recurringEndDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave blank to repeat indefinitely
                </p>
              </div>

              {/* Summary pill */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="text-blue-500 text-lg">🔁</span>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Repeats{' '}
                  <strong>
                    {formData.recurringInterval === 1
                      ? formData.recurringPattern
                      : `every ${formData.recurringInterval} ${patternLabels[formData.recurringPattern]?.toLowerCase() ?? 'units'}`}
                  </strong>
                  {formData.recurringEndDate && (
                    <> until <strong>{new Date(formData.recurringEndDate).toLocaleDateString()}</strong></>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Assign To — only shown in workspace context */}
        {workspaceMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              👤 Assign To
            </label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Unassigned —</option>
              {workspaceMembers.map(member => (
                <option key={member.user._id} value={member.user._id}>
                  {member.user.name} · {member.role}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Labels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Labels
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add a label (press Enter)"
            />
            <button
              type="button"
              onClick={addLabel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.labels.map((label, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm flex items-center gap-2"
              >
                {label}
                <button type="button" onClick={() => removeLabel(label)} className="text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Max 5MB per file. Supported: Images, PDF, Word, Excel, Text
          </p>
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected files ({selectedFiles.length}):
              </p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getFileIcon(file.type)}</span>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeSelectedFile(index)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {task ? 'Update Task' : 'Create Task'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;