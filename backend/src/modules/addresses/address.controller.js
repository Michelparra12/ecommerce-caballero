import { createAddressSchema } from './address.validators.js';
import { listMyAddresses, createAddress } from './address.service.js';
import { ApiError } from '../../shared/ApiError.js';

export async function listMyAddressesHandler(req, res) {
  const direcciones = await listMyAddresses(req.user.id);
  res.status(200).json({ data: direcciones });
}

export async function createAddressHandler(req, res) {
  const parseResult = createAddressSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw ApiError.badRequest('Datos de dirección inválidos', parseResult.error.flatten());
  }

  const direccion = await createAddress(req.user.id, parseResult.data);

  res.status(201).json({ data: direccion });
}
