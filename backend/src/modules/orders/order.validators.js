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

// --- Validadores de administración ---

export const listAllOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
});

// Solo transiciones logísticas: pending_payment/paid los controla el
// webhook de la pasarela de pago, no el admin manualmente.
export const updateFulfillmentSchema = z
  .object({
    estado: z.enum(['processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    guiaEnvio: z.string().trim().min(1).max(120).optional(),
    transportadora: z.string().trim().min(1).max(100).optional(),
    urlSeguimiento: z.string().trim().url().max(500).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Debes enviar al menos un campo para actualizar',
  });
