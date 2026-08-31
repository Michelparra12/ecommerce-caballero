import { firebaseAuth } from '../config/firebase.js';
import { ApiError } from '../shared/ApiError.js';
import { asyncHandler } from './errorHandler.js';
import { findOrCreateUsuarioByFirebaseUid } from '../modules/users/user.repository.js';

/**
 * Verifica el ID token de Firebase enviado como "Authorization: Bearer <token>".
 * Si es válido, adjunta req.user con el perfil de negocio (tabla usuarios),
 * creándolo en el primer login si aún no existe (auto-provisioning).
 *
 * Cualquier ruta protegida solo necesita: router.post('/', requireAuth, handler)
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Token de autenticación requerido');
  }

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw new ApiError(401, 'Token inválido o expirado');
  }

  req.user = await findOrCreateUsuarioByFirebaseUid({
    firebaseUid: decoded.uid,
    email: decoded.email,
    nombreCompleto: decoded.name ?? decoded.email,
  });

  next();
});

/**
 * Restringe una ruta a usuarios con rol específico. Debe usarse después
 * de requireAuth, ya que depende de req.user.
 *
 * Uso: router.delete('/:id', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      throw new ApiError(403, 'No tienes permisos para esta acción');
    }
    next();
  };
}
