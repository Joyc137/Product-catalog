import { CATEGORIES } from '../constants/categories.js';
import * as productService from '../services/product.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function listProducts(req, res) {
  res.json(await productService.listProducts(req.query));
}

export async function getProduct(req, res) {
  const product = await productService.getProductById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ product });
}

export async function listCategories(_req, res) {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ categories: CATEGORIES });
}

export async function createProduct(req, res) {
  const product = await productService.createProduct(req.body, req.user._id);
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const product = await productService.updateProduct(req.params.id, req.body);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const product = await productService.deleteProduct(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.status(204).end();
}

export async function getCategoryStats(_req, res) {
  res.json({ stats: await productService.getCategoryStats() });
}
