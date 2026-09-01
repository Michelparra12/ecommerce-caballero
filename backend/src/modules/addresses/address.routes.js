import { Router } from 'express';
import { listMyAddressesHandler, createAddressHandler } from './address.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const addressRouter = Router();

// Una dirección es siempre de un usuario autenticado; no hay vista pública.
addressRouter.use(requireAuth);

addressRouter.get('/', asyncHandler(listMyAddressesHandler));
addressRouter.post('/', asyncHandler(createAddressHandler));
