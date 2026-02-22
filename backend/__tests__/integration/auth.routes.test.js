// __tests__/integration/auth.routes.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth Routes - Integration Tests', () => {

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const validUser = { name: 'John Doe', email: 'john@example.com', password: 'password123' };

    it('should register a new user and return token', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.email).toBe(validUser.email);
      expect(res.body.name).toBe(validUser.name);
      expect(res.body.password).toBeUndefined(); // never expose password
    });

    it('should save user to database', async () => {
      await request(app).post('/api/auth/register').send(validUser);
      const user = await User.findOne({ email: validUser.email });
      expect(user).not.toBeNull();
    });

    it('should not register duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validUser);
      const res = await request(app).post('/api/auth/register').send(validUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 500 if name is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'john@example.com', password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should return error if email is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'John', password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should return error if password is missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'John', email: 'john@example.com' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should return error for invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'John', email: 'not-email', password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should return a valid JWT token', async () => {
      const res = await request(app).post('/api/auth/register').send(validUser);
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBeDefined();
    });
  });

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'John Doe', email: 'john@example.com', password: 'password123',
      });
    });

    it('should login with correct credentials and return token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@example.com', password: 'password123',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.email).toBe('john@example.com');
      expect(res.body.password).toBeUndefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@example.com', password: 'wrongpassword',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com', password: 'password123',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject empty body', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── GET ME ────────────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'John Doe', email: 'john@example.com', password: 'password123',
      });
      token = res.body.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe('john@example.com');
      expect(res.body.name).toBe('John Doe');
      expect(res.body.password).toBeUndefined();
    });

    it('should return 401 with no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer sometoken');
      expect(res.statusCode).toBe(401);
    });
  });
});