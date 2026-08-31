import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/ApiError.js';

/**
 * Cliente delgado sobre la API de Wompi (pasarela colombiana con soporte
 * nativo de PSE, Nequi y tarjetas). Encapsula:
 *   - firma de integridad requerida al crear una transacción,
 *   - la llamada HTTP a la API,
 *   - la verificación del checksum del webhook de eventos.
 *
 * Si el proyecto migra a Mercado Pago, este es el único archivo a
 * reemplazar: payment.service.js no conoce detalles de Wompi.
 */

function assertConfigured() {
  if (!env.WOMPI_PRIVATE_KEY || !env.WOMPI_INTEGRITY_SECRET) {
    throw new Error('Wompi no está configurado: falta WOMPI_PRIVATE_KEY o WOMPI_INTEGRITY_SECRET');
  }
}

/**
 * Firma de integridad exigida por Wompi al crear una transacción:
 * SHA256("{referencia}{monto_en_centavos}{moneda}{secreto_integridad}")
 * Ver: https://docs.wompi.co/docs/en/firma-de-integridad
 */
function buildIntegritySignature({ reference, amountInCents, currency }) {
  const raw = `${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY_SECRET}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Crea una transacción en Wompi para una orden ya existente en nuestra BD.
 * amountInCents debe calcularse a partir de orden.total (en centavos),
 * nunca confiar en un monto enviado por el cliente.
 */
export async function createTransaction({ reference, amountInCents, currency = 'COP', customerEmail, paymentMethodType, redirectUrl }) {
  assertConfigured();

  const signature = buildIntegritySignature({ reference, amountInCents, currency });

  const response = await fetch(`${env.WOMPI_BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WOMPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount_in_cents: amountInCents,
      currency,
      customer_email: customerEmail,
      reference,
      signature,
      payment_method: { type: paymentMethodType },
      redirect_url: redirectUrl,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(502, 'Wompi rechazó la solicitud de pago', body);
  }

  return body.data;
}

/**
 * Verifica el checksum del evento de webhook de Wompi. El payload trae
 * `signature.properties` (lista de rutas a incluir en el checksum, en
 * orden), `signature.checksum` y `timestamp`. Rechazar cualquier evento
 * cuyo checksum no coincida evita procesar webhooks falsificados.
 */
export function verifyWebhookSignature(payload) {
  if (!env.WOMPI_EVENTS_SECRET) {
    throw new Error('Wompi no está configurado: falta WOMPI_EVENTS_SECRET');
  }

  const { signature, timestamp, data } = payload;

  const concatenatedValues = signature.properties
    .map((path) => path.split('.').reduce((obj, key) => obj?.[key], data))
    .join('');

  const raw = `${concatenatedValues}${timestamp}${env.WOMPI_EVENTS_SECRET}`;
  const expectedChecksum = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();

  return expectedChecksum === signature.checksum;
}
