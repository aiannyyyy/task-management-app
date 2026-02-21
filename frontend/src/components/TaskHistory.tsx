import React from 'react';
import { HistoryEntry } from '../types/task';

interface TaskHistoryProps {
  history: HistoryEntry[];
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ history }) => {
  const getActionIcon = (action: string): string => {
    const icons: Record<string, string> = {
      'created': '✨',
      'updated': '✏️',
      'status_changed': '🔄',
      'priority_changed': '🔥',
      'due_date_changed': '📅',
      'comment_added': '💬',
      'comment_deleted': '🗑️',
      'attachment_added': '📎',
      'attachment_deleted': '🗑️',
      'subtask_added': '➕',
      'subtask_completed': '✅',
      'subtask_uncompleted': '◻️',
      'subtask_deleted': '❌',
      'label_added': '🏷️',
      'label_removed': '🏷️',
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      'created': 'text-green-600 dark:text-green-400',
      'updated': 'text-blue-600 dark:text-blue-400',
      'status_changed': 'text-purple-600 dark:text-purple-400',
      'priority_changed': 'text-orange-600 dark:text-orange-400',
      'due_date_changed': 'text-yellow-600 dark:text-yellow-400',
      'comment_added': 'text-blue-600 dark:text-blue-400',
      'comment_deleted': 'text-red-600 dark:text-red-400',
      'attachment_added': 'text-green-600 dark:text-green-400',
      'attachment_deleted': 'text-red-600 dark:text-red-400',
      'subtask_added': 'text-green-600 dark:text-green-400',
      'subtask_completed': 'text-green-600 dark:text-green-400',
      'subtask_uncompleted': 'text-gray-600 dark:text-gray-400',
      'subtask_deleted': 'text-red-600 dark:text-red-400',
      'label_added': 'text-purple-600 dark:text-purple-400',
      'label_removed': 'text-gray-600 dark:text-gray-400',
    };
    return colors[action] || 'text-gray-600 dark:text-gray-400';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📜</span>
        <h4 className="font-semibold text-gray-900 dark:text-white">
          Activity History ({history.length})
        </h4>
      </div>

      {sortedHistory.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          No history yet. Changes will appear here.
        </p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-4">
            {sortedHistory.map((entry, index) => (
              <div key={entry._id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl shadow-sm">
                    {getActionIcon(entry.action)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getActionColor(entry.action)}`}>
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {entry.userName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(entry.createdAt)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          at {formatTime(entry.createdAt)}
                        </span>
                      </div>

                      {/* Show old/new values for certain changes */}
                      {entry.field && (entry.oldValue || entry.newValue) && (
                        <div className="mt-2 text-xs">
                          {entry.oldValue && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 dark:text-red-400">From:</span>
                              <code className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                                {String(entry.oldValue)}
                              </code>
                            </div>
                          )}
                          {entry.newValue && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-green-600 dark:text-green-400">To:</span>
                              <code className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                {String(entry.newValue)}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHistory;