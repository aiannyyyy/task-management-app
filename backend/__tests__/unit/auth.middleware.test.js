// __tests__/unit/auth.middleware.test.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect } = require('../../middleware/auth');
const User = require('../../models/User');
require('dotenv').config();

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

// Helper to build mock req/res/next
const mockReqResNext = (token = null) => {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('Auth Middleware - Unit Tests', () => {

  it('should call next() with valid token', async () => {
    const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const { req, res, next } = mockReqResNext(token);
    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(user._id.toString());
  });

  it('should not expose password in req.user', async () => {
    const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const { req, res, next } = mockReqResNext(token);
    await protect(req, res, next);

    expect(req.user.password).toBeUndefined();
  });

  it('should return 401 with no token', async () => {
    const { req, res, next } = mockReqResNext(null);
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', async () => {
    const { req, res, next } = mockReqResNext('invalid.token.here');
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with expired token', async () => {
    const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
    const expiredToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '0s' });

    await new Promise((r) => setTimeout(r, 100)); // wait for expiry

    const { req, res, next } = mockReqResNext(expiredToken);
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with token signed by wrong secret', async () => {
    const user = await User.create({ name: 'John', email: 'john@example.com', password: 'password123' });
    const badToken = jwt.sign({ id: user._id }, 'wrong_secret', { expiresIn: '30d' });

    const { req, res, next } = mockReqResNext(badToken);
    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});