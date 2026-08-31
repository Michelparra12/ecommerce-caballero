import { Router } from 'express';
import { getProductFeedHandler } from './feed.controller.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const feedRouter = Router();

feedRouter.get('/productos.xml', asyncHandler(getProductFeedHandler));
