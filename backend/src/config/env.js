import 'dotenv/config';

// Centraliza y valida las variables de entorno una sola vez al arrancar,
// para fallar rápido si falta configuración crítica en vez de romperse
// a mitad de una petición.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  DATABASE_URL: required('DATABASE_URL'),

  FIREBASE_PROJECT_ID: required('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: required('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),

  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ?? '',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  COMPANY_NAME: process.env.COMPANY_NAME ?? 'Accesorios de Caballero',

  WOMPI_BASE_URL: process.env.WOMPI_BASE_URL ?? 'https://production.wompi.co/v1',
  WOMPI_PUBLIC_KEY: process.env.WOMPI_PUBLIC_KEY ?? '',
  WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY ?? '',
  WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET ?? '',
  WOMPI_EVENTS_SECRET: process.env.WOMPI_EVENTS_SECRET ?? '',
};
