import { Router } from 'express';
import { getMeHandler } from './user.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, asyncHandler(getMeHandler));
