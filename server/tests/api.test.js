import './helpers/env.js';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { startDb, stopDb } from './helpers/db.js';

const app = createApp();
let adminToken;
let userToken;

async function makeUser(role) {
  const email = `${role}@test.dev`;
  await User.create({ name: role, email, password: 'Password123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return res.body.token;
}

const sample = { name: 'Test Lamp', category: 'Home & Kitchen', price: 19.99, stock: 5 };

before(async () => {
  await startDb();
  await Promise.all([User.syncIndexes(), Product.syncIndexes()]);
  adminToken = await makeUser('admin');
  userToken = await makeUser('user');
});

after(stopDb);

describe('auth', () => {
  it('registers a user, hashes the password and never returns it', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane', email: 'Jane@Example.com', password: 'secret123' });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'jane@example.com');
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.password, undefined);

    const stored = await User.findOne({ email: 'jane@example.com' }).select('+password');
    assert.notEqual(stored.password, 'secret123');
    assert.match(stored.password, /^\$2[aby]\$/);
  });

  it('does not let a client register as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Eve', email: 'eve@example.com', password: 'secret123', role: 'admin' });
    assert.equal(res.status, 400);
    assert.equal(await User.exists({ email: 'eve@example.com' }), null);
  });

  it('rejects duplicate emails with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'jane@example.com', password: 'secret123' });
    assert.equal(res.status, 409);
  });

  it('returns a generic error for bad credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'whatever1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  it('blocks NoSQL operator injection in login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.token, undefined);
  });

  it('GET /me requires a valid token and hides the password', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope')).status, 401);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.password, undefined);
  });
});

describe('products RBAC', () => {
  it('rejects writes without a token (401)', async () => {
    assert.equal((await request(app).post('/api/products').send(sample)).status, 401);
  });

  it('rejects writes from a regular user (403)', async () => {
    const product = await Product.create({ ...sample, sku: 'RBAC-1' });
    const auth = { Authorization: `Bearer ${userToken}` };

    assert.equal((await request(app).post('/api/products').set(auth).send(sample)).status, 403);
    assert.equal((await request(app).put(`/api/products/${product._id}`).set(auth).send({ price: 1 })).status, 403);
    assert.equal((await request(app).delete(`/api/products/${product._id}`).set(auth)).status, 403);
    assert.equal((await request(app).get('/api/products/stats/categories').set(auth)).status, 403);
    assert.ok(await Product.exists({ _id: product._id }));
  });

  it('lets an admin create, update and delete', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const created = await request(app).post('/api/products').set(auth).send(sample);
    assert.equal(created.status, 201);
    assert.match(created.body.product.sku, /^PRD-/);
    const id = created.body.product._id;

    const updated = await request(app).put(`/api/products/${id}`).set(auth).send({ price: 25 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.product.price, 25);

    assert.equal((await request(app).delete(`/api/products/${id}`).set(auth)).status, 204);
    assert.equal((await request(app).get(`/api/products/${id}`)).status, 404);
  });

  it('strips HTML from product text (stored XSS)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...sample, name: '<img src=x onerror=alert(1)>Nice Lamp', description: '<script>bad()</script>Bright' });
    assert.equal(res.status, 201);
    assert.equal(res.body.product.name, 'Nice Lamp');
    assert.equal(res.body.product.description, 'Bright');
  });

  it('validates product payloads server-side', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x', category: 'Nope', price: -1 });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.length >= 3);
  });
});

describe('product listing', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
    await Product.insertMany([
      { name: 'Wireless Mouse', category: 'Electronics', price: 20, stock: 3, sku: 'L-1' },
      { name: 'Gaming Mouse', category: 'Electronics', price: 60, stock: 0, sku: 'L-2' },
      { name: 'Cookbook', category: 'Books', price: 15, stock: 9, sku: 'L-3', description: 'Recipes' },
      { name: 'Novel', category: 'Books', price: 9, stock: 1, sku: 'L-4' },
    ]);
  });

  it('paginates and returns only list fields', async () => {
    const res = await request(app).get('/api/products?limit=3&page=2&sort=price_asc');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.pagination, { page: 2, limit: 3, total: 4, totalPages: 2 });
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].name, 'Gaming Mouse');
    assert.equal(res.body.items[0].description, undefined);
  });

  it('filters, searches and sorts', async () => {
    const res = await request(app).get('/api/products?q=mouse&category=Electronics&inStock=true');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items.map((p) => p.name), ['Wireless Mouse']);

    const priced = await request(app).get('/api/products?minPrice=10&maxPrice=20&sort=price_desc');
    assert.deepEqual(priced.body.items.map((p) => p.price), [20, 15]);
  });

  it('returns 400 for an invalid id and no internal details', async () => {
    const res = await request(app).get('/api/products/not-an-id');
    assert.equal(res.status, 400);
    assert.equal(res.body.stack, undefined);
    assert.doesNotMatch(JSON.stringify(res.body), /CastError|mongo/i);
  });

  it('returns 404 for a missing product', async () => {
    assert.equal((await request(app).get('/api/products/507f1f77bcf86cd799439011')).status, 404);
  });
});

describe('hardening', () => {
  it('returns a clean error for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Malformed JSON body');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.ok(res.headers['content-security-policy']);
  });

  it('only allows configured CORS origins and never allows credentials', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://allowed.test');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://allowed.test');
    assert.equal(ok.headers['access-control-allow-credentials'], undefined);

    const blocked = await request(app).get('/api/health').set('Origin', 'http://evil.test');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  });
});
