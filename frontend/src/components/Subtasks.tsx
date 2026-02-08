import React, { useState } from 'react';
import { Subtask } from '../types/task';

interface SubtasksProps {
  subtasks: Subtask[];
  onAddSubtask: (text: string) => void;
  onToggleSubtask: (subtaskId: string, completed: boolean) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

const Subtasks: React.FC<SubtasksProps> = ({ 
  subtasks, 
  onAddSubtask, 
  onToggleSubtask, 
  onDeleteSubtask 
}) => {
  const [newSubtask, setNewSubtask] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtask.trim()) {
      onAddSubtask(newSubtask.trim());
      setNewSubtask('');
    }
  };

  const completedCount = subtasks.filter(st => st.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Subtasks ({completedCount}/{totalCount})
          </h4>
        </div>
        {totalCount > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(progress)}% complete
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add Subtask Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add a subtask..."
          maxLength={200}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
        />
        <button
          type="submit"
          disabled={!newSubtask.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          Add
        </button>
      </form>

      {/* Subtasks List */}
      <div className="space-y-2">
        {subtasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No subtasks yet. Add one to break down this task!
          </p>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask._id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={(e) => onToggleSubtask(subtask._id, e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span
                className={`flex-1 text-sm ${
                  subtask.completed
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {subtask.text}
              </span>
              <button
                onClick={() => onDeleteSubtask(subtask._id)}
                className="opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm transition-opacity"
                title="Delete subtask"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Subtasks;