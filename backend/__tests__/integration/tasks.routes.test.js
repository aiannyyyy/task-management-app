// __tests__/integration/tasks.routes.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Task = require('../../models/Task');
require('dotenv').config();

// ─── Setup & Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await Task.deleteMany({});
  await User.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const registerAndLogin = async (data = {}) => {
  const userData = { name: 'John', email: 'john@example.com', password: 'password123', ...data };
  const res = await request(app).post('/api/auth/register').send(userData);
  return { token: res.body.token, userId: res.body._id };
};

const createTask = async (token, data = {}) => {
  const taskData = { title: 'Test Task', ...data };
  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send(taskData);
  return res.body;
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('Task Routes - Integration Tests', () => {

  // ── GET /api/tasks ──────────────────────────────────────────────────────────
  describe('GET /api/tasks', () => {
    it('should return empty array when user has no tasks', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return only the current user tasks', async () => {
      const { token } = await registerAndLogin();
      await createTask(token, { title: 'My Task' });

      // Another user
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });
      await createTask(token2, { title: 'Jane Task' });

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('My Task');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/tasks/:id ──────────────────────────────────────────────────────
  describe('GET /api/tasks/:id', () => {
    it('should return a single task', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token, { title: 'Single Task' });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Single Task');
    });

    it('should return 404 for non-existent task', async () => {
      const { token } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when accessing another user task', async () => {
      const { token } = await registerAndLogin();
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const task = await createTask(token2, { title: 'Jane Task' });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app).get(`/api/tasks/${task._id}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/tasks ─────────────────────────────────────────────────────────
  describe('POST /api/tasks', () => {
    it('should create a task with only title', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Task' });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body._id).toBeDefined();
    });

    it('should create task with all fields', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Full Task',
          description: 'A description',
          status: 'in-progress',
          priority: 'high',
          category: 'work',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('in-progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.category).toBe('work');
    });

    it('should save task to database', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Saved Task' });

      const task = await Task.findById(res.body._id);
      expect(task).not.toBeNull();
      expect(task.title).toBe('Saved Task');
    });

    it('should set default status to todo', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Default Task' });

      expect(res.body.status).toBe('todo');
    });

    it('should set default priority to medium', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Default Task' });

      expect(res.body.priority).toBe('medium');
    });

    it('should add created history entry', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'History Task' });

      const task = await Task.findById(res.body._id);
      expect(task.history).toHaveLength(1);
      expect(task.history[0].action).toBe('created');
    });

    it('should fail without title', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title here' });

      expect(res.statusCode).toBe(400);
    });

    it('should fail with invalid status', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bad Status', status: 'invalid-status' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Unauthorized Task' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── PUT /api/tasks/:id ──────────────────────────────────────────────────────
  describe('PUT /api/tasks/:id', () => {
    it('should update task title', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token, { title: 'Old Title' });

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    it('should update task status', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('done');
    });

    it('should add history entry on update', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token, { title: 'Original' });

      await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      const updated = await Task.findById(task._id);
      const hasUpdateHistory = updated.history.some(h => h.action === 'updated');
      expect(hasUpdateHistory).toBe(true);
    });

    it('should return 404 for non-existent task', async () => {
      const { token } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when updating another user task', async () => {
      const { token } = await registerAndLogin();
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const task = await createTask(token2);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Hacked' });

      expect(res.statusCode).toBe(403);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .send({ title: 'No Auth' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── DELETE /api/tasks/:id ───────────────────────────────────────────────────
  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should remove task from database', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      const found = await Task.findById(task._id);
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const { token } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 403 when deleting another user task', async () => {
      const { token } = await registerAndLogin();
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const task = await createTask(token2);

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 401 without token', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app).delete(`/api/tasks/${task._id}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/tasks/:id/comments ────────────────────────────────────────────
  describe('POST /api/tasks/:id/comments', () => {
    it('should add a comment to a task', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'This is a comment' });

      expect(res.statusCode).toBe(201);
      expect(res.body.comments).toHaveLength(1);
      expect(res.body.comments[0].text).toBe('This is a comment');
    });

    it('should return 403 when commenting on another user task', async () => {
      const { token } = await registerAndLogin();
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const task = await createTask(token2);

      const res = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Sneaky comment' });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/tasks/:id/subtasks ────────────────────────────────────────────
  describe('POST /api/tasks/:id/subtasks', () => {
    it('should add a subtask', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const res = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'My subtask' });

      expect(res.statusCode).toBe(201);
      expect(res.body.subtasks).toHaveLength(1);
      expect(res.body.subtasks[0].text).toBe('My subtask');
      expect(res.body.subtasks[0].completed).toBe(false);
    });

    it('should return 403 for another user task', async () => {
      const { token } = await registerAndLogin();
      const { token: token2 } = await registerAndLogin({ name: 'Jane', email: 'jane@example.com', password: 'password123' });

      const task = await createTask(token2);

      const res = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Sneaky subtask' });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── PUT /api/tasks/:id/subtasks/:subtaskId ──────────────────────────────────
  describe('PUT /api/tasks/:id/subtasks/:subtaskId', () => {
    it('should mark subtask as completed', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      // Add subtask first
      const withSubtask = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Do something' });

      const subtaskId = withSubtask.body.subtasks[0]._id;

      const res = await request(app)
        .put(`/api/tasks/${task._id}/subtasks/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completed: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.subtasks[0].completed).toBe(true);
    });
  });

  // ── DELETE /api/tasks/:id/subtasks/:subtaskId ───────────────────────────────
  describe('DELETE /api/tasks/:id/subtasks/:subtaskId', () => {
    it('should delete a subtask', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const withSubtask = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'To be deleted' });

      const subtaskId = withSubtask.body.subtasks[0]._id;

      const res = await request(app)
        .delete(`/api/tasks/${task._id}/subtasks/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const updated = await Task.findById(task._id);
      expect(updated.subtasks).toHaveLength(0);
    });
  });

  // ── DELETE /api/tasks/:id/comments/:commentId ───────────────────────────────
  describe('DELETE /api/tasks/:id/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const { token } = await registerAndLogin();
      const task = await createTask(token);

      const withComment = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Delete me' });

      const commentId = withComment.body.comments[0]._id;

      const res = await request(app)
        .delete(`/api/tasks/${task._id}/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);

      const updated = await Task.findById(task._id);
      expect(updated.comments).toHaveLength(0);
    });
  });
});