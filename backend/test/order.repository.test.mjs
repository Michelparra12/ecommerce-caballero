// Variables mínimas para que src/config/env.js no lance al importarse
// (no se usan de verdad: pg-mem sustituye la conexión real y este test
// nunca importa config/firebase.js).
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test';

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestDatabase, resetTestData } from '../test-support/helpers/testDb.mjs';

const db = setupTestDatabase();

// Importa DESPUÉS de setupTestDatabase(): 'pg' ya está mockeado, así
// que database.js (y por lo tanto order.repository.js) usan pg-mem.
const { createOrderTransaction } = await import('../src/modules/orders/order.repository.js');
const { pool } = await import('../src/config/database.js');

// Los ids nunca se asumen fijos (ej. "el primer producto es id=1"):
// como los tests no reinician las secuencias de pg-mem entre corridas,
// cada seed usa siempre el id real devuelto por RETURNING.
async function seedUsuario() {
  const { rows } = await pool.query(
    "INSERT INTO usuarios (email) VALUES ('cliente@test.com') RETURNING id"
  );
  return rows[0].id;
}

async function seedCategoria() {
  const { rows } = await pool.query(
    "INSERT INTO categorias (nombre) VALUES ('Relojes') RETURNING id"
  );
  return rows[0].id;
}

async function seedProducto(categoriaId, { nombre = 'Reloj de prueba', precio = 100000, stock = 5 } = {}) {
  const { rows } = await pool.query(
    'INSERT INTO productos (categoria_id, nombre, precio, stock) VALUES ($1, $2, $3, $4) RETURNING id',
    [categoriaId, nombre, precio, stock]
  );
  return rows[0].id;
}

before(() => {
  resetTestData(db);
});

beforeEach(() => {
  resetTestData(db);
});

test('crea la orden, descuenta el stock y congela el precio de la BD (ignora el precio del request)', async () => {
  const usuarioId = await seedUsuario();
  const categoriaId = await seedCategoria();
  const productoId = await seedProducto(categoriaId, { precio: 150000, stock: 10 });

  const orden = await createOrderTransaction({
    usuarioId,
    direccionId: null,
    metodoPago: 'nequi',
    items: [{ productoId, cantidad: 3 }],
  });

  assert.equal(orden.items.length, 1);
  assert.equal(Number(orden.items[0].precioUnitario), 150000);
  assert.equal(orden.items[0].cantidad, 3);
  assert.equal(Number(orden.subtotal), 450000);

  const { rows } = await pool.query('SELECT stock FROM productos WHERE id = $1', [productoId]);
  assert.equal(rows[0].stock, 7, 'el stock debe descontarse en 3 (10 - 3)');
});

test('rechaza la orden si no hay stock suficiente y NO descuenta stock (rollback)', async () => {
  const usuarioId = await seedUsuario();
  const categoriaId = await seedCategoria();
  const productoId = await seedProducto(categoriaId, { precio: 100000, stock: 2 });

  await assert.rejects(
    () =>
      createOrderTransaction({
        usuarioId,
        direccionId: null,
        metodoPago: 'nequi',
        items: [{ productoId, cantidad: 5 }],
      }),
    /Stock insuficiente/
  );

  const { rows } = await pool.query('SELECT stock FROM productos WHERE id = $1', [productoId]);
  assert.equal(rows[0].stock, 2, 'el stock no debe cambiar cuando la orden falla');

  const ordenes = await pool.query('SELECT COUNT(*)::int AS total FROM ordenes');
  assert.equal(ordenes.rows[0].total, 0, 'no debe quedar ninguna orden creada tras el rollback');
});

test('rechaza si el producto no existe y no crea ninguna orden', async () => {
  const usuarioId = await seedUsuario();

  await assert.rejects(
    () =>
      createOrderTransaction({
        usuarioId,
        direccionId: null,
        metodoPago: 'nequi',
        items: [{ productoId: 999999, cantidad: 1 }],
      }),
    /no existe o no está disponible/
  );

  const ordenes = await pool.query('SELECT COUNT(*)::int AS total FROM ordenes');
  assert.equal(ordenes.rows[0].total, 0);
});

test('suma correctamente varios ítems y aplica el costo de envío fijo', async () => {
  const usuarioId = await seedUsuario();
  const categoriaId = await seedCategoria();
  const productoId1 = await seedProducto(categoriaId, { nombre: 'Reloj', precio: 100000, stock: 10 });
  const productoId2 = await seedProducto(categoriaId, { nombre: 'Gafas', precio: 50000, stock: 10 });

  const orden = await createOrderTransaction({
    usuarioId,
    direccionId: null,
    metodoPago: 'pse',
    items: [
      { productoId: productoId1, cantidad: 2 },
      { productoId: productoId2, cantidad: 1 },
    ],
  });

  // subtotal = 100000*2 + 50000*1 = 250000; total = subtotal + envío (12000)
  assert.equal(Number(orden.subtotal), 250000);
  assert.equal(Number(orden.total), 262000);
  assert.match(orden.numero_orden, /^ORD-\d{4}-\d{6}$/);
});
