import { findAddressesByUsuario, insertAddress } from './address.repository.js';

export async function listMyAddresses(usuarioId) {
  return findAddressesByUsuario(usuarioId);
}

export async function createAddress(usuarioId, data) {
  return insertAddress({ usuarioId, ...data });
}
