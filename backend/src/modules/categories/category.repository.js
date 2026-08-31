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
