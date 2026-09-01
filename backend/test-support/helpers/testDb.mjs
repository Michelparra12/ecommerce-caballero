import { mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newDb } from 'pg-mem';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/test-schema.sql');

/**
 * Sustituye el driver real 'pg' por pg-mem ANTES de que cualquier
 * módulo de la app lo importe, y carga el schema de prueba. Debe
 * llamarse una sola vez, al principio del archivo de test, antes de
 * cualquier `import` (dinámico) de src/config/database.js.
 *
 * Se usa pg-mem en vez de mocks manuales de queries para probar
 * comportamiento REAL de Postgres: constraints CHECK, FOREIGN KEY,
 * UNIQUE y transacciones BEGIN/COMMIT/ROLLBACK, no solo que se haya
 * llamado a `query()` con cierto texto.
 */
export function setupTestDatabase() {
  const db = newDb();
  const pgAdapter = db.adapters.createPg();

  mock.module('pg', {
    defaultExport: { Pool: pgAdapter.Pool, Client: pgAdapter.Client },
    namedExports: { Pool: pgAdapter.Pool, Client: pgAdapter.Client },
  });

  const schema = readFileSync(schemaPath, 'utf-8');
  db.public.none(schema);

  return db;
}

// Entre tests: vacía todas las tablas para que cada test arranque desde
// datos limpios sin recrear el schema completo (más rápido, y evita
// repetir el mock.module). DELETE en vez de TRUNCATE: en pruebas
// repetidas, TRUNCATE ... RESTART
// IDENTITY CASCADE deja a pg-mem con su índice de foreign keys
// desincronizado (un INSERT válido posterior es rechazado como si
// violara la FK). No se reinician las secuencias a propósito — los
// tests SIEMPRE deben usar el id devuelto por RETURNING, nunca asumir
// que empieza en 1, así que da igual que seq siga subiendo entre tests.
export function resetTestData(db) {
  for (const table of ['detalle_ordenes', 'ordenes', 'productos', 'categorias', 'usuarios']) {
    db.public.none(`DELETE FROM ${table};`);
  }
}
