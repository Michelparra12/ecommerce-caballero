import { getCategoryTree, getCategoryBySlug, createCategory, updateCategory } from './category.service.js';
import { createCategorySchema, updateCategorySchema } from './category.validators.js';
import { ApiError } from '../../shared/ApiError.js';

export async function listCategoriesHandler(req, res) {
  const tree = await getCategoryTree();
  res.status(200).json({ data: tree });
}

export async function getCategoryBySlugHandler(req, res) {
  const category = await getCategoryBySlug(req.params.slug);
  res.status(200).json({ data: category });
}

// --- Handlers de administración ---

export async function createCategoryHandler(req, res) {
  const parseResult = createCategorySchema.safeParse(req.body);

  if (!parseResult.success) {
    throw ApiError.badRequest('Datos de categoría inválidos', parseResult.error.flatten());
  }

  const categoria = await createCategory(parseResult.data);

  res.status(201).json({ data: categoria });
}

export async function updateCategoryHandler(req, res) {
  const parseResult = updateCategorySchema.safeParse(req.body);

  if (!parseResult.success) {
    throw ApiError.badRequest('Datos de categoría inválidos', parseResult.error.flatten());
  }

  const categoria = await updateCategory(Number(req.params.id), parseResult.data);

  res.status(200).json({ data: categoria });
}
