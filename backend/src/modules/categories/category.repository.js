import { query } from '../../config/database.js';

// Árbol de categorías activas, usado para el menú de navegación y los
// filtros del catálogo. Es una tabla pequeña: se trae completa y se
// arma el árbol en memoria en el service (evita queries recursivas).
export async function findAllActiveCategories() {
  const result = await query(
    `SELECT id, nombre, slug, categoria_padre_id, descripcion
     FROM categorias
     WHERE activa = TRUE
     ORDER BY nombre ASC`
  );
  return result.rows;
}

export async function findCategoryBySlug(slug) {
  const result = await query(
    'SELECT * FROM categorias WHERE slug = $1 AND activa = TRUE',
    [slug]
  );
  return result.rows[0] ?? null;
}

// --- Operaciones de administración ---

export async function findCategoryByIdAny(id) {
  const result = await query('SELECT * FROM categorias WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function insertCategory({ nombre, slug, categoriaPadreId, descripcion }) {
  const result = await query(
    `INSERT INTO categorias (nombre, slug, categoria_padre_id, descripcion)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nombre, slug, categoriaPadreId ?? null, descripcion ?? null]
  );
  return result.rows[0];
}

const UPDATABLE_FIELDS = {
  nombre: 'nombre',
  slug: 'slug',
  categoriaPadreId: 'categoria_padre_id',
  descripcion: 'descripcion',
  activa: 'activa',
};

export async function updateCategory(id, data) {
  const columns = [];
  const values = [];

  for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (data[key] === undefined) continue;
    values.push(data[key]);
    columns.push(`${column} = $${values.length}`);
  }

  if (columns.length === 0) {
    return findCategoryByIdAny(id);
  }

  values.push(id);

  const result = await query(
    `UPDATE categorias SET ${columns.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}
