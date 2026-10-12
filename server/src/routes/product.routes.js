import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProductSchema,
  deleteProductSchema,
  getProductSchema,
  listProductsSchema,
  updateProductSchema,
} from '../validators/product.validators.js';

const router = Router();
const adminOnly = [authenticate, authorize(ROLES.ADMIN)];

// Public, read-only
router.get('/', validate(listProductsSchema), asyncHandler(productController.listProducts));
router.get('/categories', asyncHandler(productController.listCategories));

// Admin analytics (declared before "/:id" so "stats" isn't parsed as an id)
router.get('/stats/categories', ...adminOnly, asyncHandler(productController.getCategoryStats));

router.get('/:id', validate(getProductSchema), asyncHandler(productController.getProduct));

// Admin-only writes. Auth runs before validation so a non-admin gets 401/403,
// not a validation error that would reveal the expected payload shape.
router.post('/', ...adminOnly, validate(createProductSchema), asyncHandler(productController.createProduct));
router.put('/:id', ...adminOnly, validate(updateProductSchema), asyncHandler(productController.updateProduct));
router.delete('/:id', ...adminOnly, validate(deleteProductSchema), asyncHandler(productController.deleteProduct));

export default router;
