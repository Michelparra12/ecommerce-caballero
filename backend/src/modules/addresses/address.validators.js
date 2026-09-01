import { z } from 'zod';

export const createAddressSchema = z.object({
  etiqueta: z.string().trim().min(1).max(50).default('Principal'),
  ciudad: z.string().trim().min(1).max(100),
  departamento: z.string().trim().min(1).max(100),
  direccionLinea: z.string().trim().min(1).max(255),
  codigoPostal: z.string().trim().max(20).optional(),
  esPredeterminada: z.coerce.boolean().default(false),
});
