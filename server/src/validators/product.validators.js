import Joi from 'joi';
import { CATEGORIES } from '../constants/categories.js';
import { SORT_OPTIONS } from '../services/product.service.js';
import { idParams, safeString } from './common.js';

export const MAX_PAGE_SIZE = 100;

const price = Joi.number().min(0).max(1_000_000).precision(2);

const productFields = {
  name: safeString().min(2).max(120),
  description: safeString().allow('').max(2000),
  category: Joi.string().valid(...CATEGORIES),
  price,
  stock: Joi.number().integer().min(0).max(1_000_000),
  sku: Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]{3,32}$/).messages({
    'string.pattern.base': 'SKU may only contain letters, numbers and dashes (3-32 chars)',
  }),
  rating: Joi.number().min(0).max(5).precision(1),
  imageUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
};

export const listProductsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).max(10_000).default(1),
    limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(20),
    q: safeString().max(100).allow(''),
    category: Joi.string().valid(...CATEGORIES),
    minPrice: price,
    maxPrice: price.when('minPrice', { is: Joi.exist(), then: Joi.number().min(Joi.ref('minPrice')) }),
    inStock: Joi.boolean(),
    sort: Joi.string().valid(...SORT_OPTIONS),
  }),
};

export const getProductSchema = { params: idParams };

export const createProductSchema = {
  body: Joi.object({
    ...productFields,
    name: productFields.name.required(),
    category: productFields.category.required(),
    price: productFields.price.required(),
    stock: productFields.stock.required(),
  }),
};

// PUT accepts any subset of fields (at least one) so the admin form and API
// clients can update only what changed.
export const updateProductSchema = {
  params: idParams,
  body: Joi.object(productFields).min(1),
};

export const deleteProductSchema = { params: idParams };
