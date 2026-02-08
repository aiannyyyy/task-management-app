import React from 'react';
import { Task } from '../types/task';
import { taskService } from '../services/api';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDeleteAttachment?: (taskId: string, filename: string) => void;
  onViewDetails?: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onDeleteAttachment, onViewDetails }) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusColors = {
    'todo': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  const categoryIcons = {
    work: '💼',
    personal: '👤',
    shopping: '🛒',
    health: '🏥',
    other: '📌',
  };

  const getFileIcon = (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadAttachment = (filename: string, originalName: string) => {
    const url = taskService.getAttachmentUrl(task._id!, filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{categoryIcons[task.category]}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {task.title}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
          {task.description}
        </p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.map((label, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            📎 {task.attachments.length} {task.attachments.length === 1 ? 'file' : 'files'}
          </p>
          {task.attachments.slice(0, 2).map((attachment, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span>{getFileIcon(attachment.mimetype)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 dark:text-white truncate">{attachment.originalName}</p>
                  <p className="text-gray-500 dark:text-gray-400">{formatFileSize(attachment.size)}</p>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleDownloadAttachment(attachment.filename, attachment.originalName)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2"
                  title="Download"
                >
                  ⬇
                </button>
                {onDeleteAttachment && (
                  <button
                    onClick={() => onDeleteAttachment(task._id!, attachment.filename)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2"
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          {task.attachments.length > 2 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              +{task.attachments.length - 2} more
            </p>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
          {task.status.replace('-', ' ')}
        </span>
        
        <div className="flex gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(task)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-sm font-medium"
            >
              View
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => task._id && onDelete(task._id)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Show comment count and due date */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          {task.comments && task.comments.length > 0 && (
            <span>
              💬 {task.comments.length} {task.comments.length === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>
        {task.dueDate && (
          <span>
            📅 Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;