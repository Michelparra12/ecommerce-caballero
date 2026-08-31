import { query } from '../../config/database.js';

// Todos los productos activos con stock, listos para publicarse en el
// catálogo de Meta Commerce (Instagram Shopping / Facebook Shop).
export async function findFeedProducts() {
  const result = await query(
    `SELECT
       p.id, p.sku, p.nombre, p.slug, p.descripcion_corta, p.descripcion,
       p.marca, p.precio, p.stock, p.imagen_principal_url,
       c.nombre AS categoria_nombre
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     WHERE p.activo = TRUE
     ORDER BY p.id ASC`
  );
  return result.rows;
}
