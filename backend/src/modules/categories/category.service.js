import { findAllActiveCategories, findCategoryBySlug } from './category.repository.js';
import { ApiError } from '../../shared/ApiError.js';

/**
 * Convierte la lista plana de categorías en un árbol
 * (categoria_padre_id -> hijos), útil para renderizar el menú de
 * navegación del frontend sin que este tenga que conocer la jerarquía.
 */
export async function getCategoryTree() {
  const categories = await findAllActiveCategories();

  const byId = new Map(categories.map((c) => [c.id, { ...c, hijos: [] }]));
  const roots = [];

  for (const category of byId.values()) {
    if (category.categoria_padre_id && byId.has(category.categoria_padre_id)) {
      byId.get(category.categoria_padre_id).hijos.push(category);
    } else {
      roots.push(category);
    }
  }

  return roots;
}

export async function getCategoryBySlug(slug) {
  const category = await findCategoryBySlug(slug);

  if (!category) {
    throw ApiError.notFound(`Categoría '${slug}' no encontrada`);
  }

  return category;
}
