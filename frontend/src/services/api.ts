import axios from 'axios';
import { Task } from '../types/task';
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
  (error) => {
    return Promise.reject(error);
  }
);

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    const response = await api.get<Task[]>('/api/tasks');
    return response.data;
  },

  getTask: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/api/tasks/${id}`);
    return response.data;
  },

  createTask: async (task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>, files?: File[]): Promise<Task> => {
    const formData = new FormData();
    
    formData.append('title', task.title);
    if (task.description) formData.append('description', task.description);
    formData.append('status', task.status);
    formData.append('priority', task.priority);
    formData.append('category', task.category);
    formData.append('labels', JSON.stringify(task.labels));
    if (task.dueDate) formData.append('dueDate', task.dueDate);
    
    // Add files
    if (files) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await api.post<Task>('/api/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
    
    // Add files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await api.put<Task>(`/api/tasks/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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

export default api;