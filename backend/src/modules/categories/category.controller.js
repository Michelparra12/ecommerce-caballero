import { getCategoryTree, getCategoryBySlug } from './category.service.js';

export async function listCategoriesHandler(req, res) {
  const tree = await getCategoryTree();
  res.status(200).json({ data: tree });
}

export async function getCategoryBySlugHandler(req, res) {
  const category = await getCategoryBySlug(req.params.slug);
  res.status(200).json({ data: category });
}
