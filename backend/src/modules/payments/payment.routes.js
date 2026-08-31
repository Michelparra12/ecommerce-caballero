import { Router } from 'express';
import { initiatePaymentHandler, wompiWebhookHandler } from './payment.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

export const paymentRouter = Router();

// Iniciar cobro: requiere sesión (el usuario solo puede pagar sus propias órdenes).
paymentRouter.post('/:ordenId/iniciar', requireAuth, asyncHandler(initiatePaymentHandler));

// Webhook de Wompi: público por naturaleza (lo llama Wompi, no el navegador),
// se autentica por firma de checksum dentro del handler, no por sesión.
paymentRouter.post('/webhook/wompi', asyncHandler(wompiWebhookHandler));
