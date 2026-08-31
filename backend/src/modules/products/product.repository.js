import { query } from '../../config/database.js';

/**
 * Repositorio de productos: única capa que conoce SQL. El servicio y el
 * controlador nunca escriben queries directamente, así el motor de BD
 * se puede cambiar sin tocar lógica de negocio.
 */

/**
 * Busca productos activos aplicando filtros opcionales y paginación.
 * Construye el WHERE dinámicamente pero SIEMPRE con placeholders
 * parametrizados ($1, $2...) para evitar inyección SQL.
 */
export async function findProducts({ categoriaId, marca, precioMin, precioMax, busqueda, limit, offset }) {
  const conditions = ['p.activo = TRUE'];
  const params = [];

  if (categoriaId) {
    params.push(categoriaId);
    conditions.push(`p.categoria_id = $${params.length}`);
  }

  if (marca) {
    params.push(marca);
    conditions.push(`p.marca = $${params.length}`);
  }

  if (precioMin != null) {
    params.push(precioMin);
    conditions.push(`p.precio >= $${params.length}`);
  }

  if (precioMax != null) {
    params.push(precioMax);
    conditions.push(`p.precio <= $${params.length}`);
  }

  if (busqueda) {
    params.push(busqueda);
    conditions.push(`to_tsvector('spanish', p.nombre || ' ' || COALESCE(p.marca, '')) @@ plainto_tsquery('spanish', $${params.length})`);
  }

  const whereClause = conditions.join(' AND ');

  // Se piden página de datos + conteo total en paralelo: son dos
  // queries independientes contra el pool, no hay necesidad de
  // serializarlas.
  const dataParams = [...params, limit, offset];
  const dataQuery = `
    SELECT
      p.id,
      p.sku,
      p.nombre,
      p.slug,
      p.descripcion_corta,
      p.marca,
      p.precio,
      p.precio_comparacion,
      p.stock,
      p.imagen_principal_url,
      p.destacado,
      c.nombre AS categoria_nombre,
      c.slug AS categoria_slug
    FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    WHERE ${whereClause}
    ORDER BY p.destacado DESC, p.creado_en DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM productos p
    WHERE ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, dataParams),
    query(countQuery, params),
  ]);

  return {
    items: dataResult.rows,
    totalItems: countResult.rows[0].total,
  };
}

export async function findProductBySlug(slug) {
  const result = await query(
    `SELECT p.*, c.nombre AS categoria_nombre, c.slug AS categoria_slug
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     WHERE p.slug = $1 AND p.activo = TRUE`,
    [slug]
  );

  return result.rows[0] ?? null;
}
