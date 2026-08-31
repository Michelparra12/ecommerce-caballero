import { createOrderSchema } from './order.validators.js';
import { createOrder, getOrderForUsuario, listMyOrders } from './order.service.js';
import { ApiError } from '../../shared/ApiError.js';

export async function createOrderHandler(req, res) {
  const parseResult = createOrderSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw ApiError.badRequest('Datos de orden inválidos', parseResult.error.flatten());
  }

  const orden = await createOrder(req.user.id, parseResult.data);

  res.status(201).json({ data: orden });
}

export async function getOrderHandler(req, res) {
  const orderId = Number(req.params.id);
  const orden = await getOrderForUsuario(orderId, req.user.id);

  res.status(200).json({ data: orden });
}

export async function listMyOrdersHandler(req, res) {
  const ordenes = await listMyOrders(req.user.id);
  res.status(200).json({ data: ordenes });
}
