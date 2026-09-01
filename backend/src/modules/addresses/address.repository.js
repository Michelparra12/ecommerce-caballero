import { query, getClient } from '../../config/database.js';

export async function findAddressesByUsuario(usuarioId) {
  const result = await query(
    'SELECT * FROM direcciones WHERE usuario_id = $1 ORDER BY es_predeterminada DESC, creado_en DESC',
    [usuarioId]
  );
  return result.rows;
}

export async function findAddressById(id) {
  const result = await query('SELECT * FROM direcciones WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

/**
 * Inserta la dirección y, si viene marcada como predeterminada, le
 * quita esa marca a cualquier otra del mismo usuario dentro de la misma
 * transacción (solo puede haber una predeterminada a la vez).
 */
export async function insertAddress({ usuarioId, etiqueta, ciudad, departamento, direccionLinea, codigoPostal, esPredeterminada }) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    if (esPredeterminada) {
      await client.query('UPDATE direcciones SET es_predeterminada = FALSE WHERE usuario_id = $1', [usuarioId]);
    }

    const result = await client.query(
      `INSERT INTO direcciones (usuario_id, etiqueta, ciudad, departamento, direccion_linea, codigo_postal, es_predeterminada)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [usuarioId, etiqueta, ciudad, departamento, direccionLinea, codigoPostal ?? null, esPredeterminada]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
