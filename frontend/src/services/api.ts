import axios from 'axios';
import { Task } from '../types/task';
import { Workspace, CreateWorkspaceData } from '../types/workspace';
import { authService } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const user = authService.getCurrentUser();
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Task Service ─────────────────────────────────────────────────────────────
export const taskService = {
  getAllTasks: async (workspaceId?: string): Promise<Task[]> => {
    const params = workspaceId ? { workspaceId } : {};
    const response = await api.get<Task[]>('/api/tasks', { params });
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/api/tasks/${id}`);
    return response.data;
  },

  createTask: async (
    task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>,
    files?: File[],
    workspaceId?: string
  ): Promise<Task> => {
    const formData = new FormData();
    formData.append('title', task.title);
    if (task.description) formData.append('description', task.description);
    formData.append('status', task.status);
    formData.append('priority', task.priority);
    formData.append('category', task.category);
    formData.append('labels', JSON.stringify(task.labels));
    if (task.dueDate) formData.append('dueDate', task.dueDate);
    if (workspaceId) formData.append('workspace', workspaceId);
    if (task.assignedTo) formData.append('assignedTo', (task.assignedTo as any)?._id ?? task.assignedTo as string);

    // Recurring fields
    if (task.isRecurring !== undefined) formData.append('isRecurring', String(task.isRecurring));
    if (task.recurringPattern) formData.append('recurringPattern', task.recurringPattern);
    if (task.recurringInterval) formData.append('recurringInterval', String(task.recurringInterval));
    if (task.recurringEndDate) formData.append('recurringEndDate', task.recurringEndDate);

    if (files) files.forEach(file => formData.append('files', file));

    const response = await api.post<Task>('/api/tasks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateTask: async (id: string, task: Partial<Task>, files?: File[]): Promise<Task> => {
    const formData = new FormData();
    if (task.title) formData.append('title', task.title);
    if (task.description !== undefined) formData.append('description', task.description);
    if (task.status) formData.append('status', task.status);
    if (task.priority) formData.append('priority', task.priority);
    if (task.category) formData.append('category', task.category);
    if (task.labels) formData.append('labels', JSON.stringify(task.labels));
    if (task.dueDate !== undefined) formData.append('dueDate', task.dueDate || '');

    // Recurring fields
    if (task.isRecurring !== undefined) formData.append('isRecurring', String(task.isRecurring));
    if (task.recurringPattern) formData.append('recurringPattern', task.recurringPattern);
    if (task.recurringInterval) formData.append('recurringInterval', String(task.recurringInterval));
    if (task.recurringEndDate !== undefined) formData.append('recurringEndDate', task.recurringEndDate || '');

    if (files && files.length > 0) files.forEach(file => formData.append('files', file));

    const response = await api.put<Task>(`/api/tasks/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  assignTask: async (taskId: string, assignedTo: string | null): Promise<Task> => {
    const response = await api.put<Task>(`/api/tasks/${taskId}/assign`, { assignedTo });
    return response.data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/api/tasks/${id}`);
  },

  deleteAttachment: async (taskId: string, filename: string): Promise<void> => {
    await api.delete(`/api/tasks/${taskId}/attachments/${filename}`);
  },

  getAttachmentUrl: (taskId: string, filename: string): string => {
    return `${API_URL}/api/tasks/${taskId}/attachments/${filename}`;
  },

  addComment: async (taskId: string, text: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/tasks/${taskId}/comments`, { text });
    return response.data;
  },

  deleteComment: async (taskId: string, commentId: string): Promise<void> => {
    await api.delete(`/api/tasks/${taskId}/comments/${commentId}`);
  },

  addSubtask: async (taskId: string, text: string): Promise<Task> => {
    const response = await api.post<Task>(`/api/tasks/${taskId}/subtasks`, { text });
    return response.data;
  },

  toggleSubtask: async (taskId: string, subtaskId: string, completed: boolean): Promise<Task> => {
    const response = await api.put<Task>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { completed });
    return response.data;
  },

  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`);
  },
};

// ─── Workspace Service ────────────────────────────────────────────────────────
export const workspaceService = {
  getAll: async (): Promise<Workspace[]> => {
    const response = await api.get<Workspace[]>('/api/workspaces');
    return response.data;
  },

  getOne: async (id: string): Promise<Workspace> => {
    const response = await api.get<Workspace>(`/api/workspaces/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkspaceData): Promise<Workspace> => {
    const response = await api.post<Workspace>('/api/workspaces', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateWorkspaceData>): Promise<Workspace> => {
    const response = await api.put<Workspace>(`/api/workspaces/${id}`, data);
    return response.data;
  },

  invite: async (workspaceId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<{ message: string; token: string }> => {
    const response = await api.post(`/api/workspaces/${workspaceId}/invite`, { email, role });
    return response.data;
  },

  acceptInvite: async (token: string): Promise<{ message: string; workspace: Workspace }> => {
    const response = await api.post('/api/workspaces/accept-invite', { token });
    return response.data;
  },

  getMembers: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/members`);
    return response.data;
  },

  updateMemberRole: async (workspaceId: string, userId: string, role: 'admin' | 'member') => {
    const response = await api.put(`/api/workspaces/${workspaceId}/members/${userId}/role`, { role });
    return response.data;
  },

  removeMember: async (workspaceId: string, userId: string): Promise<void> => {
    await api.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/workspaces/${id}`);
  },
};

export default api;