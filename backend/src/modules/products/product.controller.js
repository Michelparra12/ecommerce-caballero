import { listProductsQuerySchema } from './product.validators.js';
import { listProducts, getProductBySlug } from './product.service.js';
import { ApiError } from '../../shared/ApiError.js';

/**
 * GET /api/productos
 *
 * Lista el catálogo con paginación y filtros combinables:
 *   ?page=2&limit=24&categoriaId=3&marca=Casio&precioMin=100000&precioMax=500000&q=reloj+automatico
 *
 * El controlador solo orquesta: valida entrada, delega en el service,
 * y da forma a la respuesta HTTP. No conoce SQL ni reglas de negocio.
 */
export async function listProductsHandler(req, res) {
  const parseResult = listProductsQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw ApiError.badRequest('Parámetros de filtro inválidos', parseResult.error.flatten());
  }

  const result = await listProducts(parseResult.data);

  res.status(200).json(result);
}

/**
 * GET /api/productos/:slug
 *
 * Detalle de un producto por slug (usado también por la vista SSR
 * para inyectar el JSON-LD de Schema.org Product).
 */
export async function getProductBySlugHandler(req, res) {
  const { slug } = req.params;

  const product = await getProductBySlug(slug);

  res.status(200).json({ data: product });
}
