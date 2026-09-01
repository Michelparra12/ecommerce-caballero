import { createOrderSchema, listAllOrdersQuerySchema, updateFulfillmentSchema } from './order.validators.js';
import {
  createOrder,
  getOrderForUsuario,
  getOrderByNumeroForUsuario,
  listMyOrders,
  listAllOrders,
  getOrderAny,
  updateFulfillment,
} from './order.service.js';
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

export async function getOrderByNumeroHandler(req, res) {
  const orden = await getOrderByNumeroForUsuario(req.params.numeroOrden, req.user.id);
  res.status(200).json({ data: orden });
}

// --- Handlers de administración ---

export async function listAllOrdersHandler(req, res) {
  const parseResult = listAllOrdersQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw ApiError.badRequest('Parámetros de filtro inválidos', parseResult.error.flatten());
  }

  const result = await listAllOrders(parseResult.data);

  res.status(200).json(result);
}

export async function getOrderAnyHandler(req, res) {
  const orden = await getOrderAny(Number(req.params.id));
  res.status(200).json({ data: orden });
}

export async function updateFulfillmentHandler(req, res) {
  const parseResult = updateFulfillmentSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw ApiError.badRequest('Datos de envío inválidos', parseResult.error.flatten());
  }

  const orden = await updateFulfillment(Number(req.params.id), parseResult.data);

  res.status(200).json({ data: orden });
}
