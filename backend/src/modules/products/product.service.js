import {
  findProducts,
  findProductBySlug,
  findProductByIdAny,
  insertProduct,
  updateProduct as updateProductInRepo,
  setProductStock,
  softDeleteProduct,
} from './product.repository.js';
import { buildPaginatedResponse } from '../../shared/pagination.js';
import { ApiError } from '../../shared/ApiError.js';

// Postgres error 23505 = unique_violation (sku o slug repetidos). Se
// traduce a un 400 legible en vez de dejar escapar el error crudo de pg
// como un 500 genérico.
function rethrowAsApiError(err) {
  if (err.code === '23505') {
    throw ApiError.badRequest('Ya existe un producto con ese SKU o slug');
  }
  if (err.code === '23503') {
    throw ApiError.badRequest('La categoría indicada no existe');
  }
  throw err;
}

/**
 * Lógica de negocio de catálogo. Traduce filtros ya validados en
 * parámetros de repositorio y da forma a la respuesta paginada.
 * Si mañana el listado necesita reglas extra (ej. ocultar productos
 * sin stock, aplicar descuentos por campaña), este es el lugar.
 */
export async function listProducts(filters) {
  const { page, limit, categoriaId, marca, precioMin, precioMax, q } = filters;
  const offset = (page - 1) * limit;

  const { items, totalItems } = await findProducts({
    categoriaId,
    marca,
    precioMin,
    precioMax,
    busqueda: q,
    limit,
    offset,
  });

  return buildPaginatedResponse(items, totalItems, { page, limit });
}

export async function getProductBySlug(slug) {
  const product = await findProductBySlug(slug);

  if (!product) {
    throw ApiError.notFound(`Producto '${slug}' no encontrado`);
  }

  return product;
}

// --- Operaciones de administración ---

async function getProductOrThrow(id) {
  const product = await findProductByIdAny(id);

  if (!product) {
    throw ApiError.notFound(`Producto ${id} no encontrado`);
  }

  return product;
}

export async function createProduct(data) {
  try {
    return await insertProduct(data);
  } catch (err) {
    rethrowAsApiError(err);
  }
}

export async function updateProduct(id, data) {
  await getProductOrThrow(id);

  try {
    return await updateProductInRepo(id, data);
  } catch (err) {
    rethrowAsApiError(err);
  }
}

export async function updateStock(id, stock) {
  await getProductOrThrow(id);
  return setProductStock(id, stock);
}

export async function deactivateProduct(id) {
  await getProductOrThrow(id);
  return softDeleteProduct(id);
}
