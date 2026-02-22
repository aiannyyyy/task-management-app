import React, { useState } from 'react';
import { Task } from '../types/task';
import { taskService } from '../services/api';
import { WorkspaceMember } from '../types/workspace';
import Comments from './Comments';
import Subtasks from './Subtasks';
import TaskHistory from './TaskHistory';

interface TaskDetailsProps {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDeleteAttachment: (taskId: string, filename: string) => void;
  onAddComment: (taskId: string, text: string) => void;
  onDeleteComment: (taskId: string, commentId: string) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  workspaceMembers?: WorkspaceMember[];
}

const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  onClose,
  onEdit,
  onDelete,
  onDeleteAttachment,
  onAddComment,
  onDeleteComment,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  workspaceMembers = [],
}) => {
  const [assigning, setAssigning] = useState(false);
  const [localAssignee, setLocalAssignee] = useState(task.assignedTo);
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

  const categoryIcons: Record<string, string> = {
    work: '💼', personal: '👤', shopping: '🛒', health: '🏥', other: '📌',
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

  const handleAssign = async (userId: string | null) => {
    setAssigning(true);
    try {
      const updated = await taskService.assignTask(task._id!, userId);
      setLocalAssignee(updated.assignedTo);
    } catch (err) {
      console.error('Failed to assign task', err);
    } finally {
      setAssigning(false);
    }
  };

  const getRecurringSummary = (): string => {
    if (!task.isRecurring || !task.recurringPattern || task.recurringPattern === 'none') return '';
    const interval = task.recurringInterval ?? 1;
    const patternLabel: Record<string, string> = {
      daily: interval === 1 ? 'Daily' : `Every ${interval} days`,
      weekly: interval === 1 ? 'Weekly' : `Every ${interval} weeks`,
      monthly: interval === 1 ? 'Monthly' : `Every ${interval} months`,
    };
    return patternLabel[task.recurringPattern] ?? task.recurringPattern;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{categoryIcons[task.category]}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {task.title}
                  </h2>
                  {/* Recurring badge in header */}
                  {task.isRecurring && task.recurringPattern !== 'none' && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium flex items-center gap-1">
                      🔁 {getRecurringSummary()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className={`px-3 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
                    {task.status.replace('-', ' ')}
                  </span>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">{task.description}</p>
            </div>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {task.labels.map((label, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Due Date</h3>
              <p className="text-gray-700 dark:text-gray-300">
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* ── Assigned To ── */}
          {workspaceMembers.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">👤 Assigned To</h3>
              {localAssignee ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {((localAssignee as any).name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {(localAssignee as any).name ?? 'Team member'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(localAssignee as any).email ?? ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(null)}
                    disabled={assigning}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    Unassign
                  </button>
                </div>
              ) : (
                <select
                  onChange={e => handleAssign(e.target.value || null)}
                  disabled={assigning}
                  defaultValue=""
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">— Assign to a team member —</option>
                  {workspaceMembers.map(member => (
                    <option key={member.user._id} value={member.user._id}>
                      {member.user.name} · {member.role}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Recurring Info ── */}
          {task.isRecurring && task.recurringPattern && task.recurringPattern !== 'none' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Recurring Schedule</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 text-lg">🔁</span>
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {getRecurringSummary()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-blue-700 dark:text-blue-300 pl-7">
                  <span className="text-blue-500 dark:text-blue-400">Pattern</span>
                  <span className="capitalize font-medium">{task.recurringPattern}</span>

                  <span className="text-blue-500 dark:text-blue-400">Interval</span>
                  <span className="font-medium">
                    Every {task.recurringInterval ?? 1}{' '}
                    {task.recurringPattern === 'daily' ? 'day(s)' : task.recurringPattern === 'weekly' ? 'week(s)' : 'month(s)'}
                  </span>

                  {task.recurringEndDate && (
                    <>
                      <span className="text-blue-500 dark:text-blue-400">Ends on</span>
                      <span className="font-medium">
                        {new Date(task.recurringEndDate).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </span>
                    </>
                  )}

                  {task.lastRecurredDate && (
                    <>
                      <span className="text-blue-500 dark:text-blue-400">Last spawned</span>
                      <span className="font-medium">
                        {new Date(task.lastRecurredDate).toLocaleDateString()}
                      </span>
                    </>
                  )}

                  {task.parentTaskId && (
                    <>
                      <span className="text-blue-500 dark:text-blue-400">Origin</span>
                      <span className="font-medium text-xs font-mono truncate">#{task.parentTaskId}</span>
                    </>
                  )}
                </div>

                {task.status !== 'done' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 pl-7 mt-1">
                    ℹ️ A new task will be created automatically once this one is marked as done.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Attachments ({task.attachments.length})
              </h3>
              <div className="space-y-2">
                {task.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{getFileIcon(attachment.mimetype)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{attachment.originalName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadAttachment(attachment.filename, attachment.originalName)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1"
                        title="Download"
                      >
                        ⬇ Download
                      </button>
                      <button
                        onClick={() => onDeleteAttachment(task._id!, attachment.filename)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <Subtasks
              subtasks={task.subtasks || []}
              onAddSubtask={(text) => onAddSubtask(task._id!, text)}
              onToggleSubtask={(subtaskId, completed) => onToggleSubtask(task._id!, subtaskId, completed)}
              onDeleteSubtask={(subtaskId) => onDeleteSubtask(task._id!, subtaskId)}
            />
          </div>

          {/* Comments */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <Comments
              comments={task.comments || []}
              onAddComment={(text) => onAddComment(task._id!, text)}
              onDeleteComment={(commentId) => onDeleteComment(task._id!, commentId)}
            />
          </div>

          {/* History */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <TaskHistory history={task.history || []} />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={() => onEdit(task)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Edit Task
          </button>
          <button
            onClick={() => { onDelete(task._id!); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Delete Task
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;