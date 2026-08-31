import {
  findAllActiveCategories,
  findCategoryBySlug,
  findCategoryByIdAny,
  insertCategory,
  updateCategory as updateCategoryInRepo,
} from './category.repository.js';
import { ApiError } from '../../shared/ApiError.js';

function rethrowAsApiError(err) {
  if (err.code === '23505') {
    throw ApiError.badRequest('Ya existe una categoría con ese slug');
  }
  if (err.code === '23503') {
    throw ApiError.badRequest('La categoría padre indicada no existe');
  }
  throw err;
}

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

// --- Operaciones de administración ---

export async function createCategory(data) {
  try {
    return await insertCategory(data);
  } catch (err) {
    rethrowAsApiError(err);
  }
}

export async function updateCategory(id, data) {
  const existing = await findCategoryByIdAny(id);

  if (!existing) {
    throw ApiError.notFound(`Categoría ${id} no encontrada`);
  }

  if (data.categoriaPadreId === id) {
    throw ApiError.badRequest('Una categoría no puede ser su propia categoría padre');
  }

  try {
    return await updateCategoryInRepo(id, data);
  } catch (err) {
    rethrowAsApiError(err);
  }
}
