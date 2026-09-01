import { Router } from 'express';
import {
  createOrderHandler,
  getOrderHandler,
  getOrderByNumeroHandler,
  listMyOrdersHandler,
  listAllOrdersHandler,
  getOrderAnyHandler,
  updateFulfillmentHandler,
} from './order.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const orderRouter = Router();

// Todas las rutas de órdenes requieren un usuario autenticado.
orderRouter.use(requireAuth);

// --- Panel de administración (registradas ANTES de '/:id' para que
// 'GET /admin' no sea capturado por el patrón genérico '/:id') ---
const requireAdmin = requireRole('admin');

orderRouter.get('/admin', requireAdmin, asyncHandler(listAllOrdersHandler));
orderRouter.get('/admin/:id', requireAdmin, asyncHandler(getOrderAnyHandler));
orderRouter.patch('/admin/:id/envio', requireAdmin, asyncHandler(updateFulfillmentHandler));

// --- Rutas del cliente sobre sus propias órdenes ---
orderRouter.post('/', asyncHandler(createOrderHandler));
orderRouter.get('/', asyncHandler(listMyOrdersHandler));
// Registrada ANTES de '/:id' por la misma razón que '/admin' arriba:
// 'GET /numero/ORD-...' no debe ser capturado por '/:id'.
orderRouter.get('/numero/:numeroOrden', asyncHandler(getOrderByNumeroHandler));
orderRouter.get('/:id', asyncHandler(getOrderHandler));
