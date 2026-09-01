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
const { createTransaction, verifyWebhookSignature } = await import(
  '../src/integrations/payments/wompi.client.js'
);

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
    paymentMethodType: 'NEQUI',
    redirectUrl: 'https://tienda.test/checkout/resultado',
  });

  assert.equal(capturedUrl, 'https://sandbox.wompi.co/v1/transactions');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer prv_test_123');

  const body = JSON.parse(capturedOptions.body);
  assert.equal(body.reference, 'ORD-2026-000456');
  assert.equal(body.amount_in_cents, 25000000);
  assert.equal(body.currency, 'COP');
  assert.equal(body.payment_method.type, 'NEQUI');

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
        paymentMethodType: 'NEQUI',
        redirectUrl: 'https://tienda.test/checkout/resultado',
      }),
    (err) => {
      assert.equal(err.statusCode, 502);
      return true;
    }
  );
});
