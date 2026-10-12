import crypto from 'node:crypto';
import { Product } from '../models/Product.js';

/** Fields returned by the list endpoint — the card UI needs nothing else. */
export const LIST_PROJECTION = Object.freeze({
  name: 1,
  category: 1,
  price: 1,
  stock: 1,
  rating: 1,
  imageUrl: 1,
});

/*
 * Whitelisted sort options. Each one maps to an index declared in Product.js,
 * with _id as a tiebreaker so page boundaries are deterministic.
 */
const SORTS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: -1 },
});

export const SORT_OPTIONS = Object.freeze([...Object.keys(SORTS), 'relevance']);

/**
 * Pure function: turns validated query params into a Mongo filter, sort,
 * projection and skip/limit. Kept free of I/O so it can be unit tested.
 */
export function buildProductQuery({
  q,
  category,
  minPrice,
  maxPrice,
  inStock,
  sort,
  page = 1,
  limit = 20,
} = {}) {
  const filter = {};
  const projection = { ...LIST_PROJECTION };
  const search = typeof q === 'string' ? q.trim() : '';

  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;

  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = minPrice;
    if (maxPrice != null) filter.price.$lte = maxPrice;
  }

  if (inStock === true) filter.stock = { $gt: 0 };

  // Relevance only makes sense with a search term; it is also the default then.
  const effectiveSort = sort ?? (search ? 'relevance' : 'newest');
  let sortSpec;

  if (effectiveSort === 'relevance' && search) {
    projection.score = { $meta: 'textScore' };
    sortSpec = { score: { $meta: 'textScore' }, _id: 1 };
  } else {
    sortSpec = SORTS[effectiveSort] ?? SORTS.newest;
  }

  return {
    filter,
    projection,
    sort: sortSpec,
    skip: (page - 1) * limit,
    limit,
  };
}

export async function listProducts(params) {
  const { filter, projection, sort, skip, limit } = buildProductQuery(params);
  const page = params.page ?? 1;

  // Pagination, filtering and sorting happen in MongoDB; only one page of
  // projected, lean documents ever reaches Node.
  const [items, total] = await Promise.all([
    Product.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
    // With no filter, the collection metadata count is O(1) and exact enough.
    Object.keys(filter).length === 0
      ? Product.estimatedDocumentCount()
      : Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function getProductById(id) {
  return Product.findById(id).populate('createdBy', 'name').lean();
}

export function generateSku() {
  return `PRD-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export function createProduct(data, userId) {
  return Product.create({ ...data, sku: data.sku || generateSku(), createdBy: userId });
}

export function updateProduct(id, data) {
  return Product.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true }).lean();
}

export function deleteProduct(id) {
  return Product.findByIdAndDelete(id).lean();
}

export function getCategoryStats() {
  return Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        avgPrice: { $avg: '$price' },
        outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        count: 1,
        totalStock: 1,
        outOfStock: 1,
        avgPrice: { $round: ['$avgPrice', 2] },
      },
    },
    { $sort: { count: -1 } },
  ]);
}
