import { Router } from 'express';
import { createOrderHandler, getOrderHandler, listMyOrdersHandler } from './order.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const orderRouter = Router();

// Todas las rutas de órdenes requieren un usuario autenticado.
orderRouter.use(requireAuth);

orderRouter.post('/', asyncHandler(createOrderHandler));
orderRouter.get('/', asyncHandler(listMyOrdersHandler));
orderRouter.get('/:id', asyncHandler(getOrderHandler));
