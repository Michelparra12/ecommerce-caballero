import { ApiError } from '../shared/ApiError.js';

// Middleware de error de Express (4 argumentos = firma especial que
// Express reconoce automáticamente). Único lugar que decide el
// formato JSON de error de toda la API.
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? undefined,
    });
  }

  req.log?.error({ err }, 'Error no controlado');

  return res.status(500).json({ error: 'Error interno del servidor' });
}

// Envuelve un handler async para que sus rechazos lleguen a errorHandler
// sin necesidad de try/catch repetido en cada controlador.
export function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}
