import './helpers/env.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProductQuery, LIST_PROJECTION } from '../src/services/product.service.js';
import { listProductsSchema } from '../src/validators/product.validators.js';

describe('buildProductQuery', () => {
  it('defaults to newest first, page 1, empty filter', () => {
    const q = buildProductQuery({});
    assert.deepEqual(q.filter, {});
    assert.deepEqual(q.sort, { createdAt: -1, _id: -1 });
    assert.equal(q.skip, 0);
    assert.equal(q.limit, 20);
  });

  it('computes skip from page and limit', () => {
    const q = buildProductQuery({ page: 4, limit: 25 });
    assert.equal(q.skip, 75);
    assert.equal(q.limit, 25);
  });

  it('only projects the fields the list view needs', () => {
    const q = buildProductQuery({});
    assert.deepEqual(q.projection, LIST_PROJECTION);
    assert.equal(q.projection.description, undefined);
  });

  it('builds category, price range and in-stock filters', () => {
    const q = buildProductQuery({ category: 'Books', minPrice: 10, maxPrice: 50, inStock: true });
    assert.deepEqual(q.filter, {
      category: 'Books',
      price: { $gte: 10, $lte: 50 },
      stock: { $gt: 0 },
    });
  });

  it('supports an open-ended price range', () => {
    assert.deepEqual(buildProductQuery({ minPrice: 0 }).filter, { price: { $gte: 0 } });
    assert.deepEqual(buildProductQuery({ maxPrice: 99 }).filter, { price: { $lte: 99 } });
  });

  it('uses $text search and sorts by relevance by default when searching', () => {
    const q = buildProductQuery({ q: '  headphones ' });
    assert.deepEqual(q.filter, { $text: { $search: 'headphones' } });
    assert.deepEqual(q.sort, { score: { $meta: 'textScore' }, _id: 1 });
    assert.deepEqual(q.projection.score, { $meta: 'textScore' });
  });

  it('respects an explicit sort while searching', () => {
    const q = buildProductQuery({ q: 'mouse', sort: 'price_asc' });
    assert.deepEqual(q.sort, { price: 1, _id: 1 });
    assert.equal(q.projection.score, undefined);
  });

  it('falls back to newest when relevance is requested without a search term', () => {
    assert.deepEqual(buildProductQuery({ sort: 'relevance' }).sort, { createdAt: -1, _id: -1 });
  });

  it('always adds _id as a tiebreaker for stable pagination', () => {
    for (const sort of ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc']) {
      assert.ok('_id' in buildProductQuery({ sort }).sort, sort);
    }
  });

  it('ignores inStock=false (means "any stock")', () => {
    assert.deepEqual(buildProductQuery({ inStock: false }).filter, {});
  });
});

describe('listProductsSchema', () => {
  const validate = (query) => listProductsSchema.query.validate(query, { convert: true });

  it('coerces query-string values and applies defaults', () => {
    const { value, error } = validate({ page: '2', minPrice: '5.5', inStock: 'true' });
    assert.equal(error, undefined);
    assert.deepEqual(value, { page: 2, limit: 20, minPrice: 5.5, inStock: true });
  });

  it('caps the page size to prevent over-fetching', () => {
    assert.ok(validate({ limit: '1000' }).error);
  });

  it('rejects unknown sort fields and categories', () => {
    assert.ok(validate({ sort: 'password' }).error);
    assert.ok(validate({ category: 'Weapons' }).error);
  });

  it('rejects maxPrice below minPrice', () => {
    assert.ok(validate({ minPrice: '50', maxPrice: '10' }).error);
  });

  it('rejects unknown query params and operator objects', () => {
    assert.ok(validate({ foo: 'bar' }).error);
    assert.ok(validate({ category: { $ne: null } }).error);
  });

  it('strips HTML from the search term', () => {
    assert.equal(validate({ q: '<script>alert(1)</script>lamp' }).value.q, 'lamp');
  });
});
