import { Router } from 'express';
import { listProductsHandler, getProductBySlugHandler } from './product.controller.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const productRouter = Router();

// Catálogo público: sin autenticación, cacheable por CDN/n8n/Instagram feed.
productRouter.get('/', asyncHandler(listProductsHandler));
productRouter.get('/:slug', asyncHandler(getProductBySlugHandler));
