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

// A partir de aquí: operaciones de escritura, exclusivas del panel de
// administración (protegidas con requireRole('admin') en las rutas).

export async function findProductByIdAny(id) {
  // A diferencia de findProductBySlug, un admin necesita poder ver/editar
  // también productos inactivos (dados de baja), por eso no filtra por activo.
  const result = await query('SELECT * FROM productos WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function insertProduct(data) {
  const result = await query(
    `INSERT INTO productos
       (categoria_id, sku, nombre, slug, descripcion_corta, descripcion, marca,
        precio, precio_comparacion, stock, peso_gramos, imagen_principal_url,
        destacado, meta_title, meta_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      data.categoriaId,
      data.sku,
      data.nombre,
      data.slug,
      data.descripcionCorta ?? null,
      data.descripcion ?? null,
      data.marca ?? null,
      data.precio,
      data.precioComparacion ?? null,
      data.stock ?? 0,
      data.pesoGramos ?? null,
      data.imagenPrincipalUrl ?? null,
      data.destacado ?? false,
      data.metaTitle ?? null,
      data.metaDescription ?? null,
    ]
  );

  return result.rows[0];
}

// Mapa de campos permitidos en el body -> columna real en BD. Sirve de
// allowlist: cualquier clave que no esté aquí se ignora, así el body
// del request nunca puede escribir una columna arbitraria (ej. "id").
const UPDATABLE_FIELDS = {
  categoriaId: 'categoria_id',
  nombre: 'nombre',
  slug: 'slug',
  descripcionCorta: 'descripcion_corta',
  descripcion: 'descripcion',
  marca: 'marca',
  precio: 'precio',
  precioComparacion: 'precio_comparacion',
  pesoGramos: 'peso_gramos',
  imagenPrincipalUrl: 'imagen_principal_url',
  destacado: 'destacado',
  metaTitle: 'meta_title',
  metaDescription: 'meta_description',
};

export async function updateProduct(id, data) {
  const columns = [];
  const values = [];

  for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (data[key] === undefined) continue;
    values.push(data[key]);
    columns.push(`${column} = $${values.length}`);
  }

  if (columns.length === 0) {
    return findProductByIdAny(id);
  }

  values.push(id);

  const result = await query(
    `UPDATE productos SET ${columns.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}

export async function setProductStock(id, stock) {
  const result = await query(
    'UPDATE productos SET stock = $1 WHERE id = $2 RETURNING *',
    [stock, id]
  );
  return result.rows[0] ?? null;
}

export async function softDeleteProduct(id) {
  const result = await query(
    'UPDATE productos SET activo = FALSE WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] ?? null;
}
