import { query, getClient } from '../../config/database.js';
import { ApiError } from '../../shared/ApiError.js';

// Costo de envío nacional fijo hasta que exista integración con
// transportadora (Servientrega/Coordinadora). Vive aquí porque es la
// única capa que "decide" el total de la orden.
const COSTO_ENVIO_NACIONAL = 12000;

/**
 * Crea una orden completa de forma atómica:
 *   1. Bloquea (FOR UPDATE) las filas de producto involucradas para
 *      evitar condiciones de carrera con ventas simultáneas.
 *   2. Valida stock y calcula precios A PARTIR DE LA BASE DE DATOS,
 *      nunca del precio que mande el cliente en el body.
 *   3. Inserta orden + detalle_ordenes y descuenta stock.
 *   4. COMMIT si todo va bien, ROLLBACK ante cualquier error.
 *
 * Devuelve la orden creada con su detalle.
 */
export async function createOrderTransaction({ usuarioId, direccionId, metodoPago, items, notas }) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const lineItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, nombre, precio, stock FROM productos WHERE id = $1 AND activo = TRUE FOR UPDATE',
        [item.productoId]
      );

      const producto = productResult.rows[0];

      if (!producto) {
        throw ApiError.badRequest(`El producto ${item.productoId} no existe o no está disponible`);
      }

      if (producto.stock < item.cantidad) {
        throw ApiError.badRequest(
          `Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock}, solicitado: ${item.cantidad})`
        );
      }

      const subtotalLinea = Number(producto.precio) * item.cantidad;
      subtotal += subtotalLinea;

      lineItems.push({
        productoId: producto.id,
        varianteId: item.varianteId ?? null,
        nombreProducto: producto.nombre,
        precioUnitario: producto.precio,
        cantidad: item.cantidad,
        subtotalLinea,
      });

      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [
        item.cantidad,
        producto.id,
      ]);
    }

    const total = subtotal + COSTO_ENVIO_NACIONAL;

    // Se obtiene el próximo id de la secuencia ANTES del insert para
    // poder construir numero_orden (ej. ORD-2026-000123) en la misma
    // sentencia, sin una segunda vuelta a la base de datos.
    const { rows: seqRows } = await client.query("SELECT nextval('ordenes_id_seq') AS id");
    const orderId = seqRows[0].id;
    const numeroOrden = `ORD-${new Date().getFullYear()}-${String(orderId).padStart(6, '0')}`;

    const orderResult = await client.query(
      `INSERT INTO ordenes
         (id, usuario_id, direccion_id, numero_orden, metodo_pago, subtotal, costo_envio, total, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orderId, usuarioId, direccionId, numeroOrden, metodoPago, subtotal, COSTO_ENVIO_NACIONAL, total, notas ?? null]
    );

    const orden = orderResult.rows[0];

    for (const line of lineItems) {
      await client.query(
        `INSERT INTO detalle_ordenes
           (orden_id, producto_id, variante_id, nombre_producto, precio_unitario, cantidad, subtotal_linea)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orden.id, line.productoId, line.varianteId, line.nombreProducto, line.precioUnitario, line.cantidad, line.subtotalLinea]
      );
    }

    await client.query('COMMIT');

    return { ...orden, items: lineItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findOrderById(orderId) {
  const orderResult = await query('SELECT * FROM ordenes WHERE id = $1', [orderId]);
  const orden = orderResult.rows[0];

  if (!orden) return null;

  const itemsResult = await query('SELECT * FROM detalle_ordenes WHERE orden_id = $1', [orderId]);

  return { ...orden, items: itemsResult.rows };
}

export async function findOrderIdByNumero(numeroOrden) {
  const result = await query('SELECT id FROM ordenes WHERE numero_orden = $1', [numeroOrden]);
  return result.rows[0]?.id ?? null;
}

export async function findOrdersByUsuario(usuarioId) {
  const result = await query(
    'SELECT * FROM ordenes WHERE usuario_id = $1 ORDER BY creado_en DESC',
    [usuarioId]
  );
  return result.rows;
}

export async function updateOrderPaymentStatus({ orderId, estado, referenciaPasarela }) {
  const result = await query(
    `UPDATE ordenes
     SET estado = $1, referencia_pasarela = COALESCE($2, referencia_pasarela)
     WHERE id = $3
     RETURNING *`,
    [estado, referenciaPasarela ?? null, orderId]
  );
  return result.rows[0] ?? null;
}

// --- Panel de administración ---

/**
 * Lista TODAS las órdenes (de cualquier usuario), con filtro opcional
 * por estado y paginación. A diferencia de findOrdersByUsuario, esta
 * función es exclusiva de rutas protegidas con requireRole('admin').
 */
export async function findAllOrders({ estado, limit, offset }) {
  const conditions = [];
  const params = [];

  if (estado) {
    params.push(estado);
    conditions.push(`o.estado = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...params, limit, offset];
  const dataQuery = `
    SELECT o.*, u.nombre_completo AS cliente_nombre, u.email AS cliente_email
    FROM ordenes o
    JOIN usuarios u ON u.id = o.usuario_id
    ${whereClause}
    ORDER BY o.creado_en DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM ordenes o ${whereClause}`;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, dataParams),
    query(countQuery, params),
  ]);

  return { items: dataResult.rows, totalItems: countResult.rows[0].total };
}

/**
 * Actualiza el estado logístico de una orden y, opcionalmente, los datos
 * de envío. Separado de updateOrderPaymentStatus porque este lo usa el
 * admin (despacho/entrega), no el webhook de la pasarela de pago.
 */
export async function updateOrderFulfillment({ orderId, estado, guiaEnvio, transportadora, urlSeguimiento }) {
  const result = await query(
    `UPDATE ordenes
     SET estado = COALESCE($1, estado),
         guia_envio = COALESCE($2, guia_envio),
         transportadora = COALESCE($3, transportadora),
         url_seguimiento = COALESCE($4, url_seguimiento)
     WHERE id = $5
     RETURNING *`,
    [estado ?? null, guiaEnvio ?? null, transportadora ?? null, urlSeguimiento ?? null, orderId]
  );
  return result.rows[0] ?? null;
}
