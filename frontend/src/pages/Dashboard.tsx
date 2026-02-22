import React, { useState, useEffect } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { taskService, workspaceService } from '../services/api';
import { Task, TaskStatus } from '../types/task';
import { Workspace } from '../types/workspace';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskDetails from '../components/TaskDetails';
import Statistics from '../components/Statistics';
import WorkspacePanel from '../components/WorkspacePanel';
import CalendarView from '../components/CalendarView';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'none' | 'priority' | 'dueDate' | 'createdAt'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add('dark');
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const data = await workspaceService.getAll();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAllTasks(activeWorkspace?._id);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  const handleCreateTask = async (taskData: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>, files?: File[]) => {
    try {
      if (editingTask && editingTask._id) {
        await taskService.updateTask(editingTask._id, taskData, files);
      } else {
        await taskService.createTask(taskData, files, activeWorkspace?._id);
      }
      fetchTasks();
      setShowForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
    setViewingTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(id);
        fetchTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleDeleteAttachment = async (taskId: string, filename: string) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      try {
        await taskService.deleteAttachment(taskId, filename);
        fetchTasks();
        if (viewingTask && viewingTask._id === taskId) {
          const updatedTask = await taskService.getTask(taskId);
          setViewingTask(updatedTask);
        }
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      }
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    try {
      const updatedTask = await taskService.addComment(taskId, text);
      fetchTasks();
      if (viewingTask && viewingTask._id === taskId) setViewingTask(updatedTask);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteComment = async (taskId: string, commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await taskService.deleteComment(taskId, commentId);
        fetchTasks();
        if (viewingTask && viewingTask._id === taskId) {
          const updatedTask = await taskService.getTask(taskId);
          setViewingTask(updatedTask);
        }
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  const handleAddSubtask = async (taskId: string, text: string) => {
    try {
      const updatedTask = await taskService.addSubtask(taskId, text);
      fetchTasks();
      if (viewingTask && viewingTask._id === taskId) setViewingTask(updatedTask);
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    try {
      const updatedTask = await taskService.toggleSubtask(taskId, subtaskId, completed);
      fetchTasks();
      if (viewingTask && viewingTask._id === taskId) setViewingTask(updatedTask);
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    if (window.confirm('Are you sure you want to delete this subtask?')) {
      try {
        await taskService.deleteSubtask(taskId, subtaskId);
        fetchTasks();
        if (viewingTask && viewingTask._id === taskId) {
          const updatedTask = await taskService.getTask(taskId);
          setViewingTask(updatedTask);
        }
      } catch (error) {
        console.error('Failed to delete subtask:', error);
      }
    }
  };

  const handleViewDetails = (task: Task) => setViewingTask(task);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find(t => t._id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t._id === taskId);
    if (!task || task.status === newStatus) return;
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  // Filter & sort
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortTasks = (tasksToSort: Task[]) => {
    if (sortBy === 'none') return tasksToSort;
    return [...tasksToSort].sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'priority') {
        const order = { high: 3, medium: 2, low: 1 };
        compareValue = order[a.priority] - order[b.priority];
      } else if (sortBy === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        compareValue = aDate - bDate;
      } else if (sortBy === 'createdAt') {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        compareValue = aCreated - bCreated;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  const sortedTasks = sortTasks(filteredTasks);
  const tasksByStatus = {
    todo: sortedTasks.filter(t => t.status === 'todo'),
    'in-progress': sortedTasks.filter(t => t.status === 'in-progress'),
    done: sortedTasks.filter(t => t.status === 'done'),
  };

  const statusLabels = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!showForm ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                {/* Workspace switcher pill */}
                <button
                  onClick={() => setShowWorkspacePanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                >
                  <span>{activeWorkspace ? '🏢' : '👤'}</span>
                  <span>{activeWorkspace ? activeWorkspace.name : 'Personal Tasks'}</span>
                  <span className="text-gray-400">▾</span>
                  {workspaces.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                      {workspaces.length}
                    </span>
                  )}
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {activeWorkspace ? activeWorkspace.name : 'My Tasks'}
                </h2>
                {activeWorkspace && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    👥 {activeWorkspace.members.length} member{activeWorkspace.members.length !== 1 ? 's' : ''}
                    {activeWorkspace.description && ` · ${activeWorkspace.description}`}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCalendar(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  🗓 Calendar
                </button>
                <button
                  onClick={() => setShowStatistics(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  📊 Statistics
                </button>
                <button
                  onClick={() => { setEditingTask(null); setShowForm(true); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  + New Task
                </button>
              </div>
            </div>

            {/* Search / filter / sort row — unchanged */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="🔍 Search tasks..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Tasks</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                {(searchQuery || filterStatus !== 'all' || sortBy !== 'none') && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilterStatus('all'); setSortBy('none'); }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
                <div className="flex gap-2">
                  {(['priority', 'dueDate', 'createdAt'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => { if (sortBy === s) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(s); setSortOrder(s === 'priority' ? 'desc' : 'asc'); } }}
                      className={`px-4 py-2 rounded-lg transition-colors ${sortBy === s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                      {s === 'priority' && `🔥 Priority`}
                      {s === 'dueDate' && `📅 Due Date`}
                      {s === 'createdAt' && `🕐 Created`}
                      {sortBy === s && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  ))}
                  {sortBy !== 'none' && (
                    <button onClick={() => setSortBy('none')} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                      ✕ Clear Sort
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading tasks...</div>
            ) : (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(status => (
                    <DroppableColumn
                      key={status}
                      id={status}
                      title={statusLabels[status]}
                      tasks={tasksByStatus[status]}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onDeleteAttachment={handleDeleteAttachment}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeTask ? (
                    <div className="opacity-50">
                      <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
            <TaskForm
              task={editingTask}
              onSubmit={handleCreateTask}
              onCancel={() => { setShowForm(false); setEditingTask(null); }}
              workspaceMembers={activeWorkspace?.members ?? []}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingTask && (
        <TaskDetails
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onDeleteAttachment={handleDeleteAttachment}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          workspaceMembers={activeWorkspace?.members ?? []}
        />
      )}

      {showStatistics && (
        <Statistics tasks={tasks} onClose={() => setShowStatistics(false)} />
      )}

      {showWorkspacePanel && (
        <WorkspacePanel
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={ws => { setActiveWorkspace(ws); }}
          onWorkspacesChange={fetchWorkspaces}
          onClose={() => setShowWorkspacePanel(false)}
        />
      )}

      {showCalendar && (
        <CalendarView
          tasks={tasks}
          onViewTask={(task) => { setShowCalendar(false); setViewingTask(task); }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};

// ── Droppable Column ──────────────────────────────────────────────────────────
interface DroppableColumnProps {
  id: string; title: string; tasks: Task[];
  onEdit: (task: Task) => void; onDelete: (id: string) => void;
  onDeleteAttachment: (taskId: string, filename: string) => void;
  onViewDetails: (task: Task) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, title, tasks, onEdit, onDelete, onDeleteAttachment, onViewDetails }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-colors ${isOver ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : ''}`}>
      <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white capitalize">
        {title} ({tasks.length})
      </h3>
      <div className="space-y-3 min-h-[200px]">
        {tasks.map(task => (
          <DraggableTask key={task._id} task={task} onEdit={onEdit} onDelete={onDelete} onDeleteAttachment={onDeleteAttachment} onViewDetails={onViewDetails} />
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">Drop tasks here</p>
        )}
      </div>
    </div>
  );
};

// ── Draggable Task ────────────────────────────────────────────────────────────
interface DraggableTaskProps {
  task: Task; onEdit: (task: Task) => void; onDelete: (id: string) => void;
  onDeleteAttachment: (taskId: string, filename: string) => void;
  onViewDetails: (task: Task) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, onEdit, onDelete, onDeleteAttachment, onViewDetails }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id! });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1, cursor: 'grab' }} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onDeleteAttachment={onDeleteAttachment} onViewDetails={onViewDetails} />
    </div>
  );
};

export default Dashboard;