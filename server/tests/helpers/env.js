// Must be imported before anything that reads src/config/env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placeholder';
process.env.BCRYPT_ROUNDS = '10';
process.env.CORS_ORIGINS = 'http://allowed.test';
