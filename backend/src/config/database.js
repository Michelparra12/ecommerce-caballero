import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Pool único compartido por toda la app. pg maneja el ciclo de vida de
// las conexiones; nunca se crea un Pool por request.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // Error en una conexión inactiva del pool (ej. la BD la cerró).
  // No debe tumbar el proceso: se loguea y pg reemplaza la conexión.
  console.error('Error inesperado en el pool de PostgreSQL', err);
});

/**
 * Ejecuta una query usando el pool. Punto único de acceso a la BD para
 * poder instrumentar (logs/métricas) sin tocar cada repositorio.
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Provee un cliente dedicado para transacciones (BEGIN/COMMIT/ROLLBACK).
 * El caller es responsable de hacer client.release() en un finally.
 */
export async function getClient() {
  return pool.connect();
}
