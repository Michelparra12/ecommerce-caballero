const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100; // evita que un query param arbitrario tumbe la BD

/**
 * Normaliza page/limit desde query params crudos (strings) a enteros
 * seguros, y calcula el OFFSET para SQL. Centralizado aquí para que
 * todos los endpoints paginados (productos, órdenes, reseñas...)
 * se comporten igual.
 */
export function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Da forma a la respuesta paginada estándar de la API.
 */
export function buildPaginatedResponse(items, totalItems, { page, limit }) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}
