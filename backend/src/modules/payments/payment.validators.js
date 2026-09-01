import { z } from 'zod';
import { ApiError } from '../../shared/ApiError.js';

// Cada método de pago de Wompi exige campos distintos en payment_method
// (ver https://docs.wompi.co/docs/en/metodos-de-pago). No hay forma de
// cobrar con solo { type }: PSE necesita datos del banco/documento,
// Nequi el celular, y tarjeta un token (nunca el número de tarjeta —
// eso se tokeniza en el FRONTEND con Wompi.js, por PCI compliance;
// nuestro backend jamás debe recibir ni loguear un número de tarjeta).

const pseDetailsSchema = z.object({
  userType: z.enum(['natural', 'juridica']),
  userLegalIdType: z.enum(['CC', 'CE', 'NIT']),
  userLegalId: z.string().trim().min(5).max(20),
  financialInstitutionCode: z.string().trim().min(1).max(10),
});

const nequiDetailsSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^3\d{9}$/, 'Celular colombiano inválido (10 dígitos, ej: 3001234567)'),
});

const cardDetailsSchema = z.object({
  cardToken: z.string().trim().min(1, 'Falta el token de tarjeta generado por Wompi.js'),
  installments: z.coerce.number().int().min(1).max(36).default(1),
});

const SCHEMAS_BY_METODO = {
  pse: pseDetailsSchema,
  nequi: nequiDetailsSchema,
  credit_card: cardDetailsSchema,
  debit_card: cardDetailsSchema,
};

/**
 * Valida el body de POST /api/pagos/:ordenId/iniciar según el método de
 * pago que quedó guardado en la orden (no según algo que mande el
 * cliente): así un request no puede "cambiar" el método a mitad del
 * checkout ni omitir campos requeridos por Wompi.
 */
export function parsePaymentDetails(metodoPago, body) {
  const schema = SCHEMAS_BY_METODO[metodoPago];

  if (!schema) {
    throw ApiError.badRequest(`Método de pago no soportado: ${metodoPago}`);
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw ApiError.badRequest('Datos de pago inválidos para este método', result.error.flatten());
  }

  return result.data;
}
