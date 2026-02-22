// __tests__/integration/items.routes.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Item = require('../../models/Item');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await Item.deleteMany({});
});

// ─── Helper ──────────────────────────────────────────────────────────────────
const createItem = async (data = {}) => {
  const res = await request(app)
    .post('/api/items')
    .send({ name: 'Test Item', ...data });
  return res.body;
};

// ─── TESTS ───────────────────────────────────────────────────────────────────
describe('Item Routes - Integration Tests', () => {

  // ── GET /api/items ──────────────────────────────────────────────────────────
  describe('GET /api/items', () => {
    it('should return empty array when no items exist', async () => {
      const res = await request(app).get('/api/items');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all items', async () => {
      await createItem({ name: 'Item 1' });
      await createItem({ name: 'Item 2' });

      const res = await request(app).get('/api/items');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return items sorted by newest first', async () => {
      await createItem({ name: 'First' });
      await createItem({ name: 'Second' });

      const res = await request(app).get('/api/items');
      expect(res.body[0].name).toBe('Second');
      expect(res.body[1].name).toBe('First');
    });

    it('should return items with name and description', async () => {
      await createItem({ name: 'Test', description: 'A description' });

      const res = await request(app).get('/api/items');
      expect(res.body[0].name).toBe('Test');
      expect(res.body[0].description).toBe('A description');
    });
  });

  // ── GET /api/items/:id ──────────────────────────────────────────────────────
  describe('GET /api/items/:id', () => {
    it('should return a single item by id', async () => {
      const item = await createItem({ name: 'Single Item' });

      const res = await request(app).get(`/api/items/${item._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Single Item');
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/items/${fakeId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 500 for invalid id format', async () => {
      const res = await request(app).get('/api/items/invalid-id');
      expect(res.statusCode).toBe(500);
    });
  });

  // ── POST /api/items ─────────────────────────────────────────────────────────
  describe('POST /api/items', () => {
    it('should create an item with name only', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'New Item' });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('New Item');
      expect(res.body._id).toBeDefined();
    });

    it('should create an item with name and description', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'New Item', description: 'Some description' });

      expect(res.statusCode).toBe(201);
      expect(res.body.description).toBe('Some description');
    });

    it('should save item to database', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Saved Item' });

      const item = await Item.findById(res.body._id);
      expect(item).not.toBeNull();
      expect(item.name).toBe('Saved Item');
    });

    it('should add timestamps to created item', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Timestamped Item' });

      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it('should fail without name', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ description: 'No name here' });

      expect(res.statusCode).toBe(400);
    });

    it('should fail with empty body', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // ── PUT /api/items/:id ──────────────────────────────────────────────────────
  describe('PUT /api/items/:id', () => {
    it('should update item name', async () => {
      const item = await createItem({ name: 'Old Name' });

      const res = await request(app)
        .put(`/api/items/${item._id}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('New Name');
    });

    it('should update item description', async () => {
      const item = await createItem({ name: 'Item', description: 'Old desc' });

      const res = await request(app)
        .put(`/api/items/${item._id}`)
        .send({ description: 'New desc' });

      expect(res.statusCode).toBe(200);
      expect(res.body.description).toBe('New desc');
    });

    it('should save updated item to database', async () => {
      const item = await createItem({ name: 'Before' });

      await request(app)
        .put(`/api/items/${item._id}`)
        .send({ name: 'After' });

      const updated = await Item.findById(item._id);
      expect(updated.name).toBe('After');
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/items/${fakeId}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/items/:id ───────────────────────────────────────────────────
  describe('DELETE /api/items/:id', () => {
    it('should delete an item', async () => {
      const item = await createItem();

      const res = await request(app).delete(`/api/items/${item._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should remove item from database', async () => {
      const item = await createItem();

      await request(app).delete(`/api/items/${item._id}`);

      const found = await Item.findById(item._id);
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app).delete(`/api/items/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });
  });
});