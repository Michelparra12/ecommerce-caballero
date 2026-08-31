// Error de dominio con código HTTP explícito. Los controladores nunca
// arman respuestas de error a mano: lanzan ApiError y el errorHandler
// central lo traduce a JSON.
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }
}
