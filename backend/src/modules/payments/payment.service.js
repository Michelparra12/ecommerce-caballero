import { createTransaction, verifyWebhookSignature, buildPaymentMethod } from '../../integrations/payments/wompi.client.js';
import { triggerOrderConfirmation } from '../../integrations/n8n/n8n.client.js';
import { findOrderById, findOrderIdByNumero, updateOrderPaymentStatus } from '../orders/order.repository.js';
import { findUsuarioById } from '../users/user.repository.js';
import { parsePaymentDetails } from './payment.validators.js';
import { ApiError } from '../../shared/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Mapa de estados de transacción de Wompi -> estados internos de orden.
// Vive aquí porque es conocimiento específico de esta pasarela.
const WOMPI_STATUS_MAP = {
  APPROVED: 'paid',
  DECLINED: 'cancelled',
  VOIDED: 'cancelled',
  ERROR: 'cancelled',
};

/**
 * Inicia el cobro de una orden ya creada (estado pending_payment).
 * El monto SIEMPRE se calcula desde orden.total en base de datos,
 * nunca desde algo que mande el cliente.
 */
export async function initiatePayment({ orderId, usuarioId, paymentDetails }) {
  const orden = await findOrderById(orderId);

  if (!orden || orden.usuario_id !== usuarioId) {
    throw ApiError.notFound(`Orden ${orderId} no encontrada`);
  }

  if (orden.estado !== 'pending_payment') {
    throw ApiError.badRequest(`La orden ${orden.numero_orden} ya no está pendiente de pago`);
  }

  const usuario = await findUsuarioById(usuarioId);
  const amountInCents = Math.round(Number(orden.total) * 100);

  // Cada método exige campos distintos (PSE: banco/documento, Nequi:
  // celular, tarjeta: token de Wompi.js) — se validan aquí según el
  // método que quedó fijado en la orden, no según lo que mande el body.
  const detallesValidados = parsePaymentDetails(orden.metodo_pago, paymentDetails);
  const paymentMethod = buildPaymentMethod(orden.metodo_pago, {
    ...detallesValidados,
    reference: orden.numero_orden,
  });

  const transaction = await createTransaction({
    reference: orden.numero_orden,
    amountInCents,
    customerEmail: usuario.email,
    paymentMethod,
    redirectUrl: `${env.FRONTEND_URL}/checkout/resultado?orden=${orden.numero_orden}`,
  });

  return {
    checkoutUrl: transaction.redirect_url,
    wompiTransactionId: transaction.id,
    publicKey: env.WOMPI_PUBLIC_KEY,
  };
}

/**
 * Procesa el webhook de eventos de Wompi. Idempotente: si el evento ya
 * fue aplicado (orden ya en el estado destino) simplemente no hace nada,
 * ya que Wompi puede reenviar el mismo evento más de una vez.
 */
export async function handleWompiWebhook(payload) {
  const isValid = verifyWebhookSignature(payload);

  if (!isValid) {
    throw new ApiError(401, 'Firma de webhook inválida');
  }

  const transaction = payload.data.transaction;
  const nuevoEstado = WOMPI_STATUS_MAP[transaction.status];

  if (!nuevoEstado) {
    logger.warn({ status: transaction.status }, 'Estado de transacción Wompi no mapeado');
    return;
  }

  const orderId = await findOrderIdByNumero(transaction.reference);
  const orden = orderId ? await findOrderById(orderId) : null;

  if (!orden) {
    logger.error({ reference: transaction.reference }, 'Webhook de Wompi referencia una orden inexistente');
    return;
  }

  if (orden.estado === nuevoEstado) {
    return; // ya procesado, evita duplicar la notificación de WhatsApp
  }

  const ordenActualizada = await updateOrderPaymentStatus({
    orderId: orden.id,
    estado: nuevoEstado,
    referenciaPasarela: transaction.id,
  });

  if (nuevoEstado === 'paid') {
    const usuario = await findUsuarioById(orden.usuario_id);

    await triggerOrderConfirmation({
      evento: 'orden.confirmada',
      orden: {
        numero: ordenActualizada.numero_orden,
        total: ordenActualizada.total,
      },
      cliente: {
        nombre: usuario.nombre_completo,
        telefono: usuario.telefono,
        email: usuario.email,
      },
      items: orden.items,
    });
  }
}
