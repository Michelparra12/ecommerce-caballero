import { Router } from 'express';
import { listCategoriesHandler, getCategoryBySlugHandler } from './category.controller.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const categoryRouter = Router();

categoryRouter.get('/', asyncHandler(listCategoriesHandler));
categoryRouter.get('/:slug', asyncHandler(getCategoryBySlugHandler));
