import { z } from 'zod';

// Valida y transforma los query params crudos de GET /productos.
// Todo lo que llega de req.query es string; aquí se parsea a los tipos
// reales y se rechaza cualquier valor fuera de rango antes de tocar la BD.
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoriaId: z.coerce.number().int().positive().optional(),
  marca: z.string().trim().min(1).max(100).optional(),
  precioMin: z.coerce.number().nonnegative().optional(),
  precioMax: z.coerce.number().nonnegative().optional(),
  q: z.string().trim().min(1).max(150).optional(),
});
