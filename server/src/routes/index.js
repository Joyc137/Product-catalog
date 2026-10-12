import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded' });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);

export default router;
