import { Task } from '../types/task';
import { User } from '../types/user';
import { Workspace } from '../types/workspace';
import { MOCK_TOKEN } from './config';

// Sample data for the portfolio demo. Every name and email is made up.

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const dateOnly = (offsetDays: number) => iso(offsetDays).slice(0, 10);

export const DEMO_USER: User = {
  _id: 'u_demo',
  name: 'Demo User',
  email: 'demo@example.com',
  token: MOCK_TOKEN,
};

const ALEX = { _id: 'u_alex', name: 'Alex Rivera', email: 'alex@example.com' };
const MIA = { _id: 'u_mia', name: 'Mia Santos', email: 'mia@example.com' };
const ME = { _id: DEMO_USER._id, name: DEMO_USER.name, email: DEMO_USER.email };

export const SAMPLE_ATTACHMENT_TEXT =
  'Sample attachment for the portfolio demo.\n\nLaunch checklist:\n- Final QA pass\n- Release notes\n- Announce in team chat\n';

export function initialWorkspaces(): Workspace[] {
  return [
    {
      _id: 'ws_launch',
      name: 'Product Launch',
      description: 'Sample team workspace for the v2 release',
      owner: ME,
      members: [
        { _id: 'm1', user: ME, role: 'owner', joinedAt: iso(-30) },
        { _id: 'm2', user: ALEX, role: 'admin', joinedAt: iso(-28) },
        { _id: 'm3', user: MIA, role: 'member', joinedAt: iso(-20) },
      ],
      invites: [
        {
          _id: 'inv1',
          email: 'new.teammate@example.com',
          role: 'member',
          status: 'pending',
          invitedBy: ME,
          expiresAt: iso(5),
        },
      ],
      createdAt: iso(-30),
      updatedAt: iso(-2),
    },
  ];
}

const created = (offsetDays: number, by = ME) => ({
  _id: `h_${Math.random().toString(36).slice(2, 9)}`,
  user: by._id,
  userName: by.name,
  action: 'created',
  description: `${by.name} created this task`,
  createdAt: iso(offsetDays),
});

export function initialTasks(): Task[] {
  return [
    // Personal tasks (no workspace)
    {
      _id: 't1',
      title: 'Update portfolio README',
      description: 'Add screenshots and a short setup guide.',
      status: 'todo',
      priority: 'medium',
      category: 'work',
      labels: ['docs'],
      attachments: [],
      comments: [],
      subtasks: [
        { _id: 's1', text: 'Take screenshots', completed: true, createdAt: iso(-3) },
        { _id: 's2', text: 'Write setup steps', completed: false, createdAt: iso(-3) },
      ],
      history: [created(-3)],
      dueDate: dateOnly(2),
      createdAt: iso(-3),
      updatedAt: iso(-1),
    },
    {
      _id: 't2',
      title: 'Morning run',
      status: 'in-progress',
      priority: 'low',
      category: 'health',
      labels: ['routine'],
      attachments: [],
      comments: [],
      subtasks: [],
      history: [created(-10)],
      isRecurring: true,
      recurringPattern: 'daily',
      recurringInterval: 1,
      dueDate: dateOnly(0),
      createdAt: iso(-10),
      updatedAt: iso(0),
    },
    {
      _id: 't3',
      title: 'Buy groceries for the week',
      status: 'done',
      priority: 'low',
      category: 'shopping',
      labels: [],
      attachments: [],
      comments: [],
      subtasks: [
        { _id: 's3', text: 'Vegetables', completed: true, createdAt: iso(-2) },
        { _id: 's4', text: 'Coffee', completed: true, createdAt: iso(-2) },
      ],
      history: [created(-2)],
      createdAt: iso(-2),
      updatedAt: iso(-1),
    },
    {
      _id: 't4',
      title: 'Renew gym membership',
      status: 'todo',
      priority: 'high',
      category: 'personal',
      labels: ['billing'],
      attachments: [],
      comments: [],
      subtasks: [],
      history: [created(-5)],
      dueDate: dateOnly(-1),
      createdAt: iso(-5),
      updatedAt: iso(-5),
    },
    // Team workspace tasks
    {
      _id: 't5',
      title: 'Finalize release checklist',
      description: 'Go through QA results and sign off on the v2 release.',
      status: 'in-progress',
      priority: 'high',
      category: 'work',
      labels: ['release', 'qa'],
      attachments: [
        {
          filename: 'sample-release-checklist.txt',
          originalName: 'release-checklist.txt',
          mimetype: 'text/plain',
          size: SAMPLE_ATTACHMENT_TEXT.length,
          uploadedAt: iso(-1),
        },
      ],
      comments: [
        { _id: 'c1', user: ALEX._id, userName: ALEX.name, text: 'QA passed on staging. Two minor UI issues logged.', createdAt: iso(-1) },
        { _id: 'c2', user: ME._id, userName: ME.name, text: 'Thanks! I will fix those before the release.', createdAt: iso(-1) },
      ],
      subtasks: [
        { _id: 's5', text: 'Review QA report', completed: true, createdAt: iso(-4) },
        { _id: 's6', text: 'Fix minor UI issues', completed: false, createdAt: iso(-4) },
        { _id: 's7', text: 'Write release notes', completed: false, createdAt: iso(-4) },
      ],
      history: [
        created(-4),
        { _id: 'h_t5_2', user: ME._id, userName: ME.name, action: 'updated', field: 'status', oldValue: 'todo', newValue: 'in-progress', description: 'Demo User changed status from todo to in-progress', createdAt: iso(-2) },
      ],
      dueDate: dateOnly(1),
      assignedTo: ME,
      workspace: 'ws_launch',
      createdAt: iso(-4),
      updatedAt: iso(-1),
    },
    {
      _id: 't6',
      title: 'Design new onboarding screens',
      status: 'todo',
      priority: 'medium',
      category: 'work',
      labels: ['design'],
      attachments: [],
      comments: [],
      subtasks: [],
      history: [created(-6, MIA)],
      dueDate: dateOnly(5),
      assignedTo: MIA,
      workspace: 'ws_launch',
      createdAt: iso(-6),
      updatedAt: iso(-6),
    },
    {
      _id: 't7',
      title: 'Set up error monitoring',
      status: 'done',
      priority: 'medium',
      category: 'work',
      labels: ['backend'],
      attachments: [],
      comments: [{ _id: 'c3', user: ALEX._id, userName: ALEX.name, text: 'Alerts now go to the team channel.', createdAt: iso(-3) }],
      subtasks: [],
      history: [created(-8, ALEX)],
      assignedTo: ALEX,
      workspace: 'ws_launch',
      createdAt: iso(-8),
      updatedAt: iso(-3),
    },
    {
      _id: 't8',
      title: 'Weekly team sync notes',
      status: 'todo',
      priority: 'low',
      category: 'work',
      labels: ['meeting'],
      attachments: [],
      comments: [],
      subtasks: [],
      history: [created(-14)],
      isRecurring: true,
      recurringPattern: 'weekly',
      recurringInterval: 1,
      dueDate: dateOnly(3),
      workspace: 'ws_launch',
      createdAt: iso(-14),
      updatedAt: iso(-7),
    },
  ];
}
