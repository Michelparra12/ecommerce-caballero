import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../config/database.js';

// Runner de migraciones minimalista: ejecuta cada .sql en
// db/migrations/ en orden alfabético, dentro de una transacción, y
// registra cuáles ya corrieron en la tabla schema_migrations para no
// re-aplicarlas. Suficiente para el tamaño de este proyecto; si crece
// el equipo, migrar a node-pg-migrate o Prisma Migrate.
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      aplicado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function run() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const sql = readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`Aplicando migración: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('Migraciones al día.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});
