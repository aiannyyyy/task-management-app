export interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'shopping' | 'health' | 'other';
  labels: string[];
  attachments: Attachment[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  user: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'shopping' | 'health' | 'other';
  labels: string[];
  attachments: Attachment[];
  comments: Comment[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Comment {
  _id: string;
  user: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'shopping' | 'health' | 'other';
  labels: string[];
  attachments: Attachment[];
  comments: Comment[];
  subtasks: Subtask[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoryEntry {
  _id: string;
  user: string;
  userName: string;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  createdAt: string;
}

export interface Subtask {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Comment {
  _id: string;
  user: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  category: 'work' | 'personal' | 'shopping' | 'health' | 'other';
  labels: string[];
  attachments: Attachment[];
  comments: Comment[];
  subtasks: Subtask[];
  history: HistoryEntry[];
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}


export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'work' | 'personal' | 'shopping' | 'health' | 'other';