// __tests__/integration/workspaces.routes.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Workspace = require('../../models/Workspace');
const Task = require('../../models/Task');
require('dotenv').config();

// ─── Setup & Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await Workspace.deleteMany({});
  await User.deleteMany({});
  await Task.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const registerUser = async (data = {}) => {
  const userData = { name: 'John', email: 'john@example.com', password: 'password123', ...data };
  const res = await request(app).post('/api/auth/register').send(userData);
  return { token: res.body.token, userId: res.body._id, email: userData.email };
};

const createWorkspace = async (token, data = {}) => {
  const res = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Workspace', ...data });
  return res.body;
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('Workspace Routes - Integration Tests', () => {

  // ── GET /api/workspaces ─────────────────────────────────────────────────────
  describe('GET /api/workspaces', () => {
    it('should return empty array when user has no workspaces', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return workspaces the user belongs to', async () => {
      const { token } = await registerUser();
      await createWorkspace(token, { name: 'My Workspace' });

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('My Workspace');
    });

    it('should not return workspaces the user is not a member of', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      await createWorkspace(token2, { name: 'Jane Workspace' });

      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/workspaces');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/workspaces ────────────────────────────────────────────────────
  describe('POST /api/workspaces', () => {
    it('should create a workspace', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Workspace' });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('New Workspace');
      expect(res.body._id).toBeDefined();
    });

    it('should set creator as owner', async () => {
      const { token, userId } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Workspace' });

      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].role).toBe('owner');
    });

    it('should create workspace with description', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Workspace', description: 'A description' });

      expect(res.statusCode).toBe(201);
      expect(res.body.description).toBe('A description');
    });

    it('should save workspace to database', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Saved Workspace' });

      const ws = await Workspace.findById(res.body._id);
      expect(ws).not.toBeNull();
      expect(ws.name).toBe('Saved Workspace');
    });

    it('should fail without name', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/name is required/i);
    });

    it('should fail with empty name', async () => {
      const { token } = await registerUser();
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '   ' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .send({ name: 'Unauthorized' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/workspaces/:id ─────────────────────────────────────────────────
  describe('GET /api/workspaces/:id', () => {
    it('should return workspace for a member', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token, { name: 'My WS' });

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('My WS');
    });

    it('should return 403 for non-member', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token2);

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const { token } = await registerUser();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/workspaces/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app).get(`/api/workspaces/${ws._id}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PUT /api/workspaces/:id ─────────────────────────────────────────────────
  describe('PUT /api/workspaces/:id', () => {
    it('should allow owner to update workspace name', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token, { name: 'Old Name' });

      const res = await request(app)
        .put(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('New Name');
    });

    it('should allow owner to update description', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app)
        .put(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'New description' });

      expect(res.statusCode).toBe(200);
      expect(res.body.description).toBe('New description');
    });

    it('should return 403 for regular member', async () => {
      const { token } = await registerUser();
      const { token: token2, email: email2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      // Invite and accept jane as member
      const inviteRes = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: email2 });

      await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token2}`)
        .send({ token: inviteRes.body.token });

      const res = await request(app)
        .put(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: 'Hacked Name' });

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const { token } = await registerUser();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/workspaces/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/workspaces/:id ──────────────────────────────────────────────
  describe('DELETE /api/workspaces/:id', () => {
    it('should allow owner to delete workspace', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app)
        .delete(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should remove workspace from database', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      await request(app)
        .delete(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token}`);

      const found = await Workspace.findById(ws._id);
      expect(found).toBeNull();
    });

    it('should return 403 for non-owner', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const res = await request(app)
        .delete(`/api/workspaces/${ws._id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const { token } = await registerUser();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/workspaces/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app).delete(`/api/workspaces/${ws._id}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/workspaces/:id/invite ─────────────────────────────────────────
  describe('POST /api/workspaces/:id/invite', () => {
    it('should allow owner to send invite', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newuser@example.com' });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.message).toMatch(/invite sent/i);
    });

    it('should save invite to database', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newuser@example.com' });

      const updated = await Workspace.findById(ws._id);
      expect(updated.invites).toHaveLength(1);
      expect(updated.invites[0].email).toBe('newuser@example.com');
      expect(updated.invites[0].status).toBe('pending');
    });

    it('should not allow duplicate pending invites', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newuser@example.com' });

      const res = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newuser@example.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already sent/i);
    });

    it('should fail without email', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should return 403 for non-owner/admin', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const res = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ email: 'anyone@example.com' });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/workspaces/accept-invite ──────────────────────────────────────
  describe('POST /api/workspaces/accept-invite', () => {
    it('should allow user to accept a valid invite', async () => {
      const { token } = await registerUser();
      const { token: token2, email: email2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const inviteRes = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: email2 });

      const res = await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token2}`)
        .send({ token: inviteRes.body.token });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/joined/i);
    });

    it('should add user as member after accepting', async () => {
      const { token } = await registerUser();
      const { token: token2, email: email2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const inviteRes = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: email2 });

      await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token2}`)
        .send({ token: inviteRes.body.token });

      const updated = await Workspace.findById(ws._id);
      expect(updated.members).toHaveLength(2);
    });

    it('should fail with invalid token', async () => {
      const { token } = await registerUser();

      const res = await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ token: 'invalidtoken123' });

      expect(res.statusCode).toBe(404);
    });

    it('should fail without token in body', async () => {
      const { token } = await registerUser();

      const res = await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });

    it('should fail if wrong user tries to accept', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });
      const { token: token3 } = await registerUser({ name: 'Bob', email: 'bob@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      // Invite jane but bob tries to accept
      const inviteRes = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'jane@example.com' });

      const res = await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token3}`)
        .send({ token: inviteRes.body.token });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── GET /api/workspaces/:id/members ─────────────────────────────────────────
  describe('GET /api/workspaces/:id/members', () => {
    it('should return members for a workspace member', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}/members`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role).toBe('owner');
    });

    it('should return 403 for non-member', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}/members`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── DELETE /api/workspaces/:id/members/:userId ──────────────────────────────
  describe('DELETE /api/workspaces/:id/members/:userId', () => {
    it('should allow member to leave workspace', async () => {
      const { token } = await registerUser();
      const { token: token2, email: email2, userId: userId2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const inviteRes = await request(app)
        .post(`/api/workspaces/${ws._id}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: email2 });

      await request(app)
        .post('/api/workspaces/accept-invite')
        .set('Authorization', `Bearer ${token2}`)
        .send({ token: inviteRes.body.token });

      const updated = await Workspace.findById(ws._id);
      const janeMember = updated.members.find(m => m.user.toString() !== ws.owner);

      const res = await request(app)
        .delete(`/api/workspaces/${ws._id}/members/${janeMember.user}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/left/i);
    });

    it('should return 404 for non-existent workspace', async () => {
      const { token, userId } = await registerUser();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/workspaces/${fakeId}/members/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /api/workspaces/:id/tasks ───────────────────────────────────────────
  describe('GET /api/workspaces/:id/tasks', () => {
    it('should return tasks for workspace members', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      // Create a task in this workspace
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Workspace Task', workspace: ws._id });

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Workspace Task');
    });

    it('should return 403 for non-member', async () => {
      const { token } = await registerUser();
      const { token: token2 } = await registerUser({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const ws = await createWorkspace(token);

      const res = await request(app)
        .get(`/api/workspaces/${ws._id}/tasks`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerUser();
      const ws = await createWorkspace(token);

      const res = await request(app).get(`/api/workspaces/${ws._id}/tasks`);
      expect(res.statusCode).toBe(401);
    });
  });
});