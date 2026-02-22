import React, { useState, useMemo } from 'react';
import { Task } from '../types/task';

interface CalendarViewProps {
  tasks: Task[];
  onViewTask: (task: Task) => void;
  onClose: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const priorityColors = {
  high:   { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',   border: 'border-red-400' },
  medium: { dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', border: 'border-amber-400' },
  low:    { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', border: 'border-emerald-400' },
};

const statusColors = {
  'todo':        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'done':        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
};

const categoryIcons: Record<string, string> = {
  work: '💼', personal: '👤', shopping: '🛒', health: '🏥', other: '📌',
};

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onViewTask, onClose }) => {
  const today = new Date();
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().split('T')[0]
  );

  // ── Build calendar grid ────────────────────────────────────────────────────
  const { calendarDays, tasksByDate } = useMemo(() => {
    const firstDay   = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev  = new Date(currentYear, currentMonth, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Trailing days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const date = new Date(currentYear, currentMonth - 1, d);
      days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: true });
    }

    // Leading days of next month
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(currentYear, currentMonth + 1, d);
      days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: false });
    }

    // Index tasks by date
    const byDate: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const key = task.dueDate.split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(task);
    });

    return { calendarDays: days, tasksByDate: byDate };
  }, [currentYear, currentMonth, tasks]);

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const todayStr = today.toISOString().split('T')[0];

  // Tasks with no due date
  const unscheduled = tasks.filter(t => !t.dueDate);

  // Stats for current month
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthTasks = tasks.filter(t => t.dueDate?.startsWith(monthStr));
  const monthDone  = monthTasks.filter(t => t.status === 'done').length;
  const monthOverdue = monthTasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < today;
  }).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <span className="text-2xl">📅</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar View</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {monthTasks.length} tasks this month
                {monthOverdue > 0 && <span className="ml-2 text-red-500">· {monthOverdue} overdue</span>}
                {monthDone > 0 && <span className="ml-2 text-emerald-500">· {monthDone} done</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Calendar panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                ‹
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {MONTHS[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={goToday}
                  className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors font-medium"
                >
                  Today
                </button>
              </div>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                ›
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-2 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 flex-1 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
              {calendarDays.map(({ date, day, isCurrentMonth }) => {
                const dayTasks = tasksByDate[date] ?? [];
                const isToday    = date === todayStr;
                const isSelected = date === selectedDate;
                const hasOverdue = dayTasks.some(t => t.status !== 'done' && new Date(date) < today);

                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative flex flex-col p-1.5 min-h-[72px] text-left transition-all
                      ${isCurrentMonth
                        ? 'bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}
                      ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}
                    `}
                  >
                    {/* Day number */}
                    <span className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 flex-shrink-0
                      ${isToday
                        ? 'bg-blue-600 text-white'
                        : isCurrentMonth
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-600'}
                    `}>
                      {day}
                    </span>

                    {/* Task dots / pills */}
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {dayTasks.slice(0, 3).map((task, i) => (
                        <div
                          key={task._id}
                          className={`
                            flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate
                            ${priorityColors[task.priority].badge}
                            ${task.status === 'done' ? 'opacity-50 line-through' : ''}
                          `}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityColors[task.priority].dot}`} />
                          <span className="truncate leading-tight">{task.title}</span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 px-1">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Overdue indicator */}
                    {hasOverdue && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Side panel ── */}
          <div className="w-72 border-l border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">

            {/* Selected date header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              {selectedDate ? (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedTasks.length === 0
                      ? 'No tasks due'
                      : `${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''} due`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Select a day</p>
              )}
            </div>

            {/* Task list for selected day */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedTasks.length === 0 && selectedDate ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🌿</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">No tasks on this day</p>
                </div>
              ) : (
                selectedTasks.map(task => (
                  <button
                    key={task._id}
                    onClick={() => onViewTask(task)}
                    className={`
                      w-full text-left p-3 rounded-xl border-l-4 transition-all
                      bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm
                      ${priorityColors[task.priority].border}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-sm flex-shrink-0">{categoryIcons[task.category]}</span>
                        <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
                        {task.status.replace('-', ' ')}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityColors[task.priority].badge}`}>
                        {task.priority}
                      </span>
                      {task.isRecurring && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                          🔁
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Unscheduled tasks */}
            {unscheduled.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Unscheduled ({unscheduled.length})
                  </p>
                </div>
                <div className="px-3 pb-3 space-y-1.5 max-h-36 overflow-y-auto">
                  {unscheduled.map(task => (
                    <button
                      key={task._id}
                      onClick={() => onViewTask(task)}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority].dot}`} />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Priority</p>
              <div className="flex gap-3">
                {(['high', 'medium', 'low'] as const).map(p => (
                  <div key={p} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${priorityColors[p].dot}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;