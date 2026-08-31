import { z } from 'zod';

const orderItemSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  varianteId: z.coerce.number().int().positive().optional(),
  cantidad: z.coerce.number().int().positive().max(50),
});

export const createOrderSchema = z.object({
  direccionId: z.coerce.number().int().positive(),
  metodoPago: z.enum(['pse', 'nequi', 'credit_card', 'debit_card']),
  items: z.array(orderItemSchema).min(1, 'La orden debe tener al menos un producto'),
  notas: z.string().max(500).optional(),
});
