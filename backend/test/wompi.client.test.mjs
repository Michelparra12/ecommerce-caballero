import crypto from 'node:crypto';

// Mínimas para que src/config/env.js no lance al importarse.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test';
process.env.WOMPI_PRIVATE_KEY = 'prv_test_123';
process.env.WOMPI_INTEGRITY_SECRET = 'integridad_secreta';
process.env.WOMPI_EVENTS_SECRET = 'eventos_secreto';
process.env.WOMPI_BASE_URL = 'https://sandbox.wompi.co/v1';

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Import dinámico (no estático): un `import` estático se resuelve ANTES
// de que corra el resto del archivo (incluidas las asignaciones a
// process.env de arriba), y wompi.client.js importa config/env.js, que
// lanza si DATABASE_URL/FIREBASE_* no están seteadas todavía.
const { createTransaction, verifyWebhookSignature, buildPaymentMethod } = await import(
  '../src/integrations/payments/wompi.client.js'
);

// --- buildPaymentMethod: los 3 métodos soportados ---

test('buildPaymentMethod arma el payload de PSE con los campos que exige Wompi', () => {
  const payload = buildPaymentMethod('pse', {
    userType: 'natural',
    userLegalIdType: 'CC',
    userLegalId: '1020304050',
    financialInstitutionCode: '1007',
    reference: 'ORD-2026-000111',
  });

  assert.deepEqual(payload, {
    type: 'PSE',
    user_type: 0,
    user_legal_id_type: 'CC',
    user_legal_id: '1020304050',
    financial_institution_code: '1007',
    payment_description: 'Pago pedido ORD-2026-000111',
  });
});

test('buildPaymentMethod mapea persona jurídica a user_type 1 en PSE', () => {
  const payload = buildPaymentMethod('pse', {
    userType: 'juridica',
    userLegalIdType: 'NIT',
    userLegalId: '900123456',
    financialInstitutionCode: '1051',
    reference: 'ORD-2026-000112',
  });

  assert.equal(payload.user_type, 1);
});

test('buildPaymentMethod arma el payload de Nequi con el celular', () => {
  const payload = buildPaymentMethod('nequi', { phoneNumber: '3001234567', reference: 'ORD-2026-000113' });

  assert.deepEqual(payload, { type: 'NEQUI', phone_number: '3001234567' });
});

test('buildPaymentMethod arma el payload de tarjeta a partir de un token (nunca datos crudos de tarjeta)', () => {
  const payload = buildPaymentMethod('credit_card', {
    cardToken: 'tok_test_abc123',
    installments: 3,
    reference: 'ORD-2026-000114',
  });

  assert.deepEqual(payload, { type: 'CARD', installments: 3, token: 'tok_test_abc123' });
  // Ninguna clave del payload debe parecer un número de tarjeta.
  assert.equal('card_number' in payload, false);
});

// --- verifyWebhookSignature ---
// El checksum esperado se calcula aquí de forma independiente (mismo
// algoritmo que documenta Wompi), no reutilizando la función bajo
// prueba, para que el test detecte de verdad un cambio de comportamiento.
function checksumEsperado({ reference, status, amountInCents, timestamp, secret }) {
  const raw = `${reference}${status}${amountInCents}${timestamp}${secret}`;
  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
}

test('verifyWebhookSignature acepta un checksum válido', () => {
  const timestamp = 1735689600;
  const data = {
    transaction: {
      id: 'txn_abc',
      reference: 'ORD-2026-000123',
      status: 'APPROVED',
      amount_in_cents: 15000000,
    },
  };

  const checksum = checksumEsperado({
    reference: data.transaction.reference,
    status: data.transaction.status,
    amountInCents: data.transaction.amount_in_cents,
    timestamp,
    secret: process.env.WOMPI_EVENTS_SECRET,
  });

  const payload = {
    timestamp,
    data,
    signature: {
      properties: ['transaction.reference', 'transaction.status', 'transaction.amount_in_cents'],
      checksum,
    },
  };

  assert.equal(verifyWebhookSignature(payload), true);
});

test('verifyWebhookSignature rechaza un payload manipulado (monto distinto al firmado)', () => {
  const timestamp = 1735689600;
  const data = {
    transaction: {
      id: 'txn_abc',
      reference: 'ORD-2026-000123',
      status: 'APPROVED',
      amount_in_cents: 15000000,
    },
  };

  // Checksum calculado para el monto ORIGINAL...
  const checksum = checksumEsperado({
    reference: data.transaction.reference,
    status: data.transaction.status,
    amountInCents: 15000000,
    timestamp,
    secret: process.env.WOMPI_EVENTS_SECRET,
  });

  // ...pero el payload que "llega" trae el monto alterado. Simula a un
  // atacante bajando el monto sin recalcular la firma.
  data.transaction.amount_in_cents = 100;

  const payload = {
    timestamp,
    data,
    signature: {
      properties: ['transaction.reference', 'transaction.status', 'transaction.amount_in_cents'],
      checksum,
    },
  };

  assert.equal(verifyWebhookSignature(payload), false);
});

test('verifyWebhookSignature rechaza si el checksum viene de otro secreto', () => {
  const timestamp = 1735689600;
  const data = { transaction: { reference: 'ORD-2026-000123', status: 'APPROVED', amount_in_cents: 1000 } };

  const checksumConSecretoIncorrecto = checksumEsperado({
    reference: data.transaction.reference,
    status: data.transaction.status,
    amountInCents: data.transaction.amount_in_cents,
    timestamp,
    secret: 'secreto-equivocado',
  });

  const payload = {
    timestamp,
    data,
    signature: {
      properties: ['transaction.reference', 'transaction.status', 'transaction.amount_in_cents'],
      checksum: checksumConSecretoIncorrecto,
    },
  };

  assert.equal(verifyWebhookSignature(payload), false);
});

// --- createTransaction ---

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('createTransaction firma con SHA256(reference+amount+currency+secreto) y usa la llave privada', async () => {
  let capturedUrl;
  let capturedOptions;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      json: async () => ({ data: { id: 'txn_nuevo', redirect_url: 'https://sandbox.wompi.co/pay/txn_nuevo' } }),
    };
  };

  const result = await createTransaction({
    reference: 'ORD-2026-000456',
    amountInCents: 25000000,
    customerEmail: 'cliente@test.com',
    paymentMethod: { type: 'NEQUI', phone_number: '3001234567' },
    redirectUrl: 'https://tienda.test/checkout/resultado',
  });

  assert.equal(capturedUrl, 'https://sandbox.wompi.co/v1/transactions');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer prv_test_123');

  const body = JSON.parse(capturedOptions.body);
  assert.equal(body.reference, 'ORD-2026-000456');
  assert.equal(body.amount_in_cents, 25000000);
  assert.equal(body.currency, 'COP');
  assert.equal(body.payment_method.type, 'NEQUI');
  assert.equal(body.payment_method.phone_number, '3001234567');

  const firmaEsperada = crypto
    .createHash('sha256')
    .update(`ORD-2026-000456${25000000}COP${process.env.WOMPI_INTEGRITY_SECRET}`)
    .digest('hex');
  assert.equal(body.signature, firmaEsperada);

  assert.equal(result.id, 'txn_nuevo');
});

test('createTransaction lanza ApiError 502 si Wompi rechaza la solicitud', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ error: { messages: { amount_in_cents: ['is required'] } } }),
  });

  await assert.rejects(
    () =>
      createTransaction({
        reference: 'ORD-2026-000789',
        amountInCents: 1000,
        customerEmail: 'cliente@test.com',
        paymentMethod: { type: 'NEQUI', phone_number: '3001234567' },
        redirectUrl: 'https://tienda.test/checkout/resultado',
      }),
    (err) => {
      assert.equal(err.statusCode, 502);
      return true;
    }
  );
});
