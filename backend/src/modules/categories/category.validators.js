import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug debe ser minúsculas, números y guiones (ej: relojes-automaticos)');

export const createCategorySchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  slug: slugSchema,
  categoriaPadreId: z.coerce.number().int().positive().optional(),
  descripcion: z.string().trim().max(1000).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  activa: z.coerce.boolean().optional(),
});
