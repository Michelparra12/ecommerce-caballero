import { Router } from 'express';
import {
  listCategoriesHandler,
  getCategoryBySlugHandler,
  createCategoryHandler,
  updateCategoryHandler,
} from './category.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const categoryRouter = Router();

categoryRouter.get('/', asyncHandler(listCategoriesHandler));
categoryRouter.get('/:slug', asyncHandler(getCategoryBySlugHandler));

// --- Panel de administración ---
const requireAdmin = [requireAuth, requireRole('admin')];

categoryRouter.post('/', ...requireAdmin, asyncHandler(createCategoryHandler));
categoryRouter.patch('/:id', ...requireAdmin, asyncHandler(updateCategoryHandler));
