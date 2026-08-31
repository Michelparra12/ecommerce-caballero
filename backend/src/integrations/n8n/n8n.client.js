import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Dispara el webhook de n8n que orquesta la mensajería transaccional
 * (confirmación de compra + guía de envío por WhatsApp).
 *
 * Deliberadamente NO lanza si falla: notificar por WhatsApp es un
 * efecto secundario del pago, nunca debe tumbar la confirmación de la
 * orden ni el webhook de la pasarela si n8n está caído. Se loguea el
 * fallo para poder reintentar manualmente o alertar.
 */
export async function triggerOrderConfirmation(payload) {
  if (!env.N8N_WEBHOOK_URL) {
    logger.warn('N8N_WEBHOOK_URL no configurado; se omite la notificación de WhatsApp');
    return;
  }

  try {
    const response = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'n8n respondió con error al webhook de orden');
    }
  } catch (err) {
    logger.error({ err }, 'No se pudo notificar a n8n la confirmación de orden');
  }
}
