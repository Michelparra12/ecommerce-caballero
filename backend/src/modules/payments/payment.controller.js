import { initiatePayment, handleWompiWebhook } from './payment.service.js';

export async function initiatePaymentHandler(req, res) {
  const orderId = Number(req.params.ordenId);

  const checkout = await initiatePayment({ orderId, usuarioId: req.user.id });

  res.status(200).json({ data: checkout });
}

/**
 * Wompi espera un 200 rápido; el procesamiento pesado (si lo hubiera)
 * debería delegarse a una cola, pero para el volumen de esta tienda un
 * update directo es suficiente.
 */
export async function wompiWebhookHandler(req, res) {
  await handleWompiWebhook(req.body);
  res.status(200).json({ received: true });
}
