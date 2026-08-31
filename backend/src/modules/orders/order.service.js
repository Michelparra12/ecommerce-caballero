import {
  createOrderTransaction,
  findOrderById,
  findOrdersByUsuario,
  findAllOrders,
  updateOrderFulfillment,
} from './order.repository.js';
import { findUsuarioById } from '../users/user.repository.js';
import { triggerOrderConfirmation } from '../../integrations/n8n/n8n.client.js';
import { ApiError } from '../../shared/ApiError.js';
import { buildPaginatedResponse } from '../../shared/pagination.js';

export async function createOrder(usuarioId, payload) {
  return createOrderTransaction({ usuarioId, ...payload });
}

export async function getOrderForUsuario(orderId, usuarioId) {
  const orden = await findOrderById(orderId);

  if (!orden) {
    throw ApiError.notFound(`Orden ${orderId} no encontrada`);
  }

  // Un cliente solo puede ver sus propias órdenes; un admin ve cualquiera
  // (esa excepción se resuelve en el controller con requireRole).
  if (orden.usuario_id !== usuarioId) {
    throw new ApiError(403, 'No tienes acceso a esta orden');
  }

  return orden;
}

export async function listMyOrders(usuarioId) {
  return findOrdersByUsuario(usuarioId);
}

// --- Operaciones de administración ---

export async function getOrderAny(orderId) {
  const orden = await findOrderById(orderId);

  if (!orden) {
    throw ApiError.notFound(`Orden ${orderId} no encontrada`);
  }

  return orden;
}

export async function listAllOrders({ page, limit, estado }) {
  const offset = (page - 1) * limit;
  const { items, totalItems } = await findAllOrders({ estado, limit, offset });
  return buildPaginatedResponse(items, totalItems, { page, limit });
}

/**
 * Actualiza el estado logístico de una orden (despacho/entrega). Si en
 * esta actualización se registra por primera vez el número de guía,
 * dispara el evento 'guia.enviada' hacia n8n para notificar al cliente
 * por WhatsApp — igual que hace el webhook de pago con 'orden.confirmada'.
 */
export async function updateFulfillment(orderId, data) {
  const ordenAnterior = await getOrderAny(orderId);

  const ordenActualizada = await updateOrderFulfillment({ orderId, ...data });

  const seRegistroGuiaPorPrimeraVez = data.guiaEnvio && !ordenAnterior.guia_envio;

  if (seRegistroGuiaPorPrimeraVez) {
    const usuario = await findUsuarioById(ordenAnterior.usuario_id);

    await triggerOrderConfirmation({
      evento: 'guia.enviada',
      orden: { numero: ordenActualizada.numero_orden },
      cliente: {
        nombre: usuario.nombre_completo,
        telefono: usuario.telefono,
      },
      guiaEnvio: {
        numeroGuia: ordenActualizada.guia_envio,
        transportadora: ordenActualizada.transportadora,
        urlSeguimiento: ordenActualizada.url_seguimiento,
      },
    });
  }

  return ordenActualizada;
}
