import { createOrderTransaction, findOrderById, findOrdersByUsuario } from './order.repository.js';
import { ApiError } from '../../shared/ApiError.js';

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
