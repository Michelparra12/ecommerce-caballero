import { findProducts, findProductBySlug } from './product.repository.js';
import { buildPaginatedResponse } from '../../shared/pagination.js';
import { ApiError } from '../../shared/ApiError.js';

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
