import { query } from '../../config/database.js';

/**
 * Busca el usuario de negocio asociado a un UID de Firebase; si es el
 * primer login, lo crea (auto-provisioning). Evita tener un paso manual
 * de "registro" separado del login de Firebase.
 */
export async function findOrCreateUsuarioByFirebaseUid({ firebaseUid, email, nombreCompleto }) {
  const existing = await query('SELECT * FROM usuarios WHERE firebase_uid = $1', [firebaseUid]);

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await query(
    `INSERT INTO usuarios (firebase_uid, email, nombre_completo)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [firebaseUid, email, nombreCompleto]
  );

  return inserted.rows[0];
}

export async function findUsuarioById(id) {
  const result = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}
