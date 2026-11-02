import type { AxiosAdapter, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Task } from '../types/task';
import { Workspace } from '../types/workspace';
import { isMockMode } from './config';
import { DEMO_USER, initialTasks, initialWorkspaces, SAMPLE_ATTACHMENT_TEXT } from './data';

// Answers every API call in the browser, so the demo never needs the backend.
// Changes live in memory only: a page refresh starts the sample data over.

let tasks: Task[] = initialTasks();
let workspaces: Workspace[] = initialWorkspaces();
const attachmentUrls = new Map<string, string>();

const ME = { _id: DEMO_USER._id, name: DEMO_USER.name, email: DEMO_USER.email };
const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

class MockError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Reads a JSON or multipart body into a plain object, plus any uploaded files. */
function readBody(data: unknown): { fields: Record<string, any>; files: File[] } {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const fields: Record<string, any> = {};
    const files: File[] = [];
    data.forEach((value, key) => {
      if (value instanceof File) files.push(value);
      else fields[key] = value;
    });
    return { fields, files };
  }
  if (typeof data === 'string' && data) {
    try {
      return { fields: JSON.parse(data), files: [] };
    } catch {
      return { fields: {}, files: [] };
    }
  }
  return { fields: (data as Record<string, any>) ?? {}, files: [] };
}

/** Turns multipart string values back into the Task field types. */
function taskFields(fields: Record<string, any>): Partial<Task> {
  const out: Partial<Task> = {};
  if (fields.title !== undefined) out.title = fields.title;
  if (fields.description !== undefined) out.description = fields.description;
  if (fields.status) out.status = fields.status;
  if (fields.priority) out.priority = fields.priority;
  if (fields.category) out.category = fields.category;
  if (fields.labels !== undefined) {
    out.labels = typeof fields.labels === 'string' ? JSON.parse(fields.labels || '[]') : fields.labels;
  }
  if (fields.dueDate !== undefined) out.dueDate = fields.dueDate || undefined;
  if (fields.isRecurring !== undefined) out.isRecurring = String(fields.isRecurring) === 'true';
  if (fields.recurringPattern) out.recurringPattern = fields.recurringPattern;
  if (fields.recurringInterval) out.recurringInterval = Number(fields.recurringInterval);
  if (fields.recurringEndDate !== undefined) out.recurringEndDate = fields.recurringEndDate || undefined;
  return out;
}

function toAttachments(files: File[]) {
  return files.map((file) => {
    const filename = newId('file');
    attachmentUrls.set(filename, URL.createObjectURL(file));
    return { filename, originalName: file.name, mimetype: file.type, size: file.size, uploadedAt: now() };
  });
}

function findTask(id: string): Task {
  const task = tasks.find((t) => t._id === id);
  if (!task) throw new MockError(404, 'Task not found');
  return task;
}

function findWorkspace(id: string): Workspace {
  const ws = workspaces.find((w) => w._id === id);
  if (!ws) throw new MockError(404, 'Workspace not found');
  return ws;
}

function memberById(userId: string) {
  for (const ws of workspaces) {
    const m = ws.members.find((member) => member.user._id === userId);
    if (m) return m.user;
  }
  return undefined;
}

function logHistory(task: Task, description: string, field?: string, oldValue?: any, newValue?: any) {
  task.history.push({
    _id: newId('h'),
    user: ME._id,
    userName: ME.name,
    action: field ? 'updated' : 'changed',
    field,
    oldValue,
    newValue,
    description,
    createdAt: now(),
  });
  task.updatedAt = now();
}

type Handler = (match: RegExpMatchArray, body: ReturnType<typeof readBody>, params: Record<string, any>) => unknown;

const routes: Array<[string, RegExp, Handler]> = [
  // Auth: any email and password sign in as the demo user.
  ['POST', /^\/api\/auth\/(login|register)$/, () => clone(DEMO_USER)],

  // Tasks
  ['GET', /^\/api\/tasks$/, (_m, _b, params) =>
    clone(params.workspaceId ? tasks.filter((t) => t.workspace === params.workspaceId) : tasks.filter((t) => !t.workspace))],
  ['GET', /^\/api\/tasks\/([^/]+)$/, (m) => clone(findTask(m[1]))],
  ['POST', /^\/api\/tasks$/, (_m, { fields, files }) => {
    const task: Task = {
      title: '',
      status: 'todo',
      priority: 'medium',
      category: 'other',
      labels: [],
      comments: [],
      subtasks: [],
      ...taskFields(fields),
      _id: newId('t'),
      attachments: toAttachments(files),
      history: [{ _id: newId('h'), user: ME._id, userName: ME.name, action: 'created', description: `${ME.name} created this task`, createdAt: now() }],
      workspace: fields.workspace || undefined,
      assignedTo: fields.assignedTo ? memberById(fields.assignedTo) : undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    tasks.unshift(task);
    return clone(task);
  }],
  ['PUT', /^\/api\/tasks\/([^/]+)\/assign$/, (m, { fields }) => {
    const task = findTask(m[1]);
    task.assignedTo = fields.assignedTo ? memberById(fields.assignedTo) : undefined;
    logHistory(task, task.assignedTo ? `${ME.name} assigned this task` : `${ME.name} unassigned this task`);
    return clone(task);
  }],
  ['PUT', /^\/api\/tasks\/([^/]+)$/, (m, { fields, files }) => {
    const task = findTask(m[1]);
    const changes = taskFields(fields);
    if (changes.status && changes.status !== task.status) {
      logHistory(task, `${ME.name} changed status from ${task.status} to ${changes.status}`, 'status', task.status, changes.status);
    } else {
      logHistory(task, `${ME.name} updated this task`);
    }
    Object.assign(task, changes);
    task.attachments.push(...toAttachments(files));
    return clone(task);
  }],
  ['DELETE', /^\/api\/tasks\/([^/]+)$/, (m) => {
    findTask(m[1]);
    tasks = tasks.filter((t) => t._id !== m[1]);
    return { message: 'Task deleted' };
  }],
  ['DELETE', /^\/api\/tasks\/([^/]+)\/attachments\/([^/]+)$/, (m) => {
    const task = findTask(m[1]);
    task.attachments = task.attachments.filter((a) => a.filename !== m[2]);
    return { message: 'Attachment deleted' };
  }],
  ['POST', /^\/api\/tasks\/([^/]+)\/comments$/, (m, { fields }) => {
    const task = findTask(m[1]);
    task.comments.push({ _id: newId('c'), user: ME._id, userName: ME.name, text: fields.text, createdAt: now() });
    return clone(task);
  }],
  ['DELETE', /^\/api\/tasks\/([^/]+)\/comments\/([^/]+)$/, (m) => {
    const task = findTask(m[1]);
    task.comments = task.comments.filter((c) => c._id !== m[2]);
    return { message: 'Comment deleted' };
  }],
  ['POST', /^\/api\/tasks\/([^/]+)\/subtasks$/, (m, { fields }) => {
    const task = findTask(m[1]);
    task.subtasks.push({ _id: newId('s'), text: fields.text, completed: false, createdAt: now() });
    return clone(task);
  }],
  ['PUT', /^\/api\/tasks\/([^/]+)\/subtasks\/([^/]+)$/, (m, { fields }) => {
    const task = findTask(m[1]);
    const sub = task.subtasks.find((s) => s._id === m[2]);
    if (!sub) throw new MockError(404, 'Subtask not found');
    sub.completed = Boolean(fields.completed);
    return clone(task);
  }],
  ['DELETE', /^\/api\/tasks\/([^/]+)\/subtasks\/([^/]+)$/, (m) => {
    const task = findTask(m[1]);
    task.subtasks = task.subtasks.filter((s) => s._id !== m[2]);
    return { message: 'Subtask deleted' };
  }],

  // Workspaces
  ['GET', /^\/api\/workspaces$/, () => clone(workspaces)],
  ['POST', /^\/api\/workspaces\/accept-invite$/, () => ({ message: 'Invite accepted', workspace: clone(workspaces[0]) })],
  ['GET', /^\/api\/workspaces\/([^/]+)$/, (m) => clone(findWorkspace(m[1]))],
  ['POST', /^\/api\/workspaces$/, (_m, { fields }) => {
    const ws: Workspace = {
      _id: newId('ws'),
      name: fields.name,
      description: fields.description,
      owner: ME,
      members: [{ _id: newId('m'), user: ME, role: 'owner', joinedAt: now() }],
      invites: [],
      createdAt: now(),
      updatedAt: now(),
    };
    workspaces.push(ws);
    return clone(ws);
  }],
  ['PUT', /^\/api\/workspaces\/([^/]+)$/, (m, { fields }) => {
    const ws = findWorkspace(m[1]);
    if (fields.name !== undefined) ws.name = fields.name;
    if (fields.description !== undefined) ws.description = fields.description;
    ws.updatedAt = now();
    return clone(ws);
  }],
  ['DELETE', /^\/api\/workspaces\/([^/]+)$/, (m) => {
    findWorkspace(m[1]);
    workspaces = workspaces.filter((w) => w._id !== m[1]);
    tasks = tasks.filter((t) => t.workspace !== m[1]);
    return { message: 'Workspace deleted' };
  }],
  ['POST', /^\/api\/workspaces\/([^/]+)\/invite$/, (m, { fields }) => {
    const ws = findWorkspace(m[1]);
    const token = newId('invite');
    ws.invites.push({ _id: newId('inv'), email: fields.email, role: fields.role ?? 'member', status: 'pending', invitedBy: ME, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() });
    return { message: 'Invite created (demo: no email is sent)', token };
  }],
  ['GET', /^\/api\/workspaces\/([^/]+)\/members$/, (m) => clone(findWorkspace(m[1]).members)],
  ['PUT', /^\/api\/workspaces\/([^/]+)\/members\/([^/]+)\/role$/, (m, { fields }) => {
    const ws = findWorkspace(m[1]);
    const member = ws.members.find((mem) => mem.user._id === m[2]);
    if (!member) throw new MockError(404, 'Member not found');
    member.role = fields.role;
    return clone(ws);
  }],
  ['DELETE', /^\/api\/workspaces\/([^/]+)\/members\/([^/]+)$/, (m) => {
    const ws = findWorkspace(m[1]);
    ws.members = ws.members.filter((mem) => mem.user._id !== m[2]);
    return { message: 'Member removed' };
  }],
];

function pathOf(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? '';
  return url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
}

const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toUpperCase();
  const path = pathOf(config);
  // A short delay so loading states look like the real app.
  await new Promise((resolve) => setTimeout(resolve, 150));
  for (const [routeMethod, pattern, handler] of routes) {
    const match = method === routeMethod ? path.match(pattern) : null;
    if (!match) continue;
    try {
      const data = handler(match, readBody(config.data), (config.params as Record<string, any>) ?? {});
      return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
    } catch (error) {
      const status = error instanceof MockError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Demo error';
      return Promise.reject({ isAxiosError: true, message, config, response: { status, data: { message }, statusText: '', headers: {}, config } });
    }
  }
  return Promise.reject({ isAxiosError: true, message: `[Demo] ${method} ${path} is not available`, config, response: { status: 404, data: { message: 'Not available in the demo' }, statusText: '', headers: {}, config } });
};

/** Points an axios instance at the in-browser sample data in demo mode. */
export function applyMockAdapter(instance: AxiosInstance): void {
  if (!isMockMode()) return;
  instance.defaults.adapter = mockAdapter;
}

/** Download link for an attachment in demo mode (uploads stay in this tab). */
export function mockAttachmentUrl(filename: string): string {
  const existing = attachmentUrls.get(filename);
  if (existing) return existing;
  const url = URL.createObjectURL(new Blob([SAMPLE_ATTACHMENT_TEXT], { type: 'text/plain' }));
  attachmentUrls.set(filename, url);
  return url;
}
