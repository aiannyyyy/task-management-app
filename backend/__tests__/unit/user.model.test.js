// __tests__/unit/user.model.test.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model - Unit Tests', () => {

  describe('Validation', () => {
    it('should create a valid user successfully', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(user._id).toBeDefined();
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should require name field', async () => {
      const user = new User({ email: 'john@example.com', password: 'password123' });
      await expect(user.save()).rejects.toThrow(/name/i);
    });

    it('should require email field', async () => {
      const user = new User({ name: 'John', password: 'password123' });
      await expect(user.save()).rejects.toThrow(/email/i);
    });

    it('should require password field', async () => {
      const user = new User({ name: 'John', email: 'john@example.com' });
      await expect(user.save()).rejects.toThrow(/password/i);
    });

    it('should reject password shorter than 6 characters', async () => {
      const user = new User({ name: 'John', email: 'john@example.com', password: '123' });
      await expect(user.save()).rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      const user = new User({ name: 'John', email: 'not-an-email', password: 'password123' });
      await expect(user.save()).rejects.toThrow(/valid email/i);
    });

    it('should reject duplicate emails', async () => {
      await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const duplicate = new User({ name: 'Jane', email: 'john@example.com', password: 'password123' });
      await expect(duplicate.save()).rejects.toThrow();
    });

    it('should lowercase the email', async () => {
      const user = await User.create({ name: 'John', email: 'JOHN@EXAMPLE.COM', password: 'password123' });
      expect(user.email).toBe('john@example.com');
    });
  });

  describe('Password Hashing', () => {
    it('should hash the password before saving', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const found = await User.findById(user._id).select('+password');
      expect(found.password).not.toBe('password123');
      expect(found.password).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
    });

    it('should not re-hash password if not modified', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const found = await User.findById(user._id).select('+password');
      const originalHash = found.password;

      found.name = 'John Updated';
      await found.save();

      const updated = await User.findById(user._id).select('+password');
      expect(updated.password).toBe(originalHash);
    });

    it('should not expose password in default queries', async () => {
      await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const found = await User.findOne({ email: 'john@example.com' });
      expect(found.password).toBeUndefined();
    });
  });

  describe('comparePassword method', () => {
    it('should return true for correct password', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const found = await User.findById(user._id).select('+password');
      const isMatch = await found.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      const found = await User.findById(user._id).select('+password');
      const isMatch = await found.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('Default values', () => {
    it('should set notificationsEnabled to true by default', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      expect(user.notificationsEnabled).toBe(true);
    });

    it('should set workspace to null by default', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      expect(user.workspace).toBeNull();
    });

    it('should add createdAt and updatedAt timestamps', async () => {
      const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });
});