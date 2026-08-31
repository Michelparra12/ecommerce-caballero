import { Router } from 'express';
import {
  listProductsHandler,
  getProductBySlugHandler,
  createProductHandler,
  updateProductHandler,
  updateStockHandler,
  deactivateProductHandler,
} from './product.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const productRouter = Router();

// Catálogo público: sin autenticación, cacheable por CDN/n8n/Instagram feed.
productRouter.get('/', asyncHandler(listProductsHandler));
productRouter.get('/:slug', asyncHandler(getProductBySlugHandler));

// --- Panel de administración: requiere sesión + rol admin ---
const requireAdmin = [requireAuth, requireRole('admin')];

productRouter.post('/', ...requireAdmin, asyncHandler(createProductHandler));
productRouter.patch('/:id', ...requireAdmin, asyncHandler(updateProductHandler));
productRouter.patch('/:id/stock', ...requireAdmin, asyncHandler(updateStockHandler));
productRouter.delete('/:id', ...requireAdmin, asyncHandler(deactivateProductHandler));
