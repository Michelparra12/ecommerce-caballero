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

// --- Validadores de escritura (panel de administración) ---

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(220)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug debe ser minúsculas, números y guiones (ej: reloj-automatico-acero)');

export const createProductSchema = z.object({
  categoriaId: z.coerce.number().int().positive(),
  sku: z.string().trim().min(1).max(50),
  nombre: z.string().trim().min(1).max(200),
  slug: slugSchema,
  descripcionCorta: z.string().trim().max(300).optional(),
  descripcion: z.string().trim().optional(),
  marca: z.string().trim().max(100).optional(),
  precio: z.coerce.number().nonnegative(),
  precioComparacion: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  pesoGramos: z.coerce.number().int().positive().optional(),
  imagenPrincipalUrl: z.string().trim().url().max(500).optional(),
  destacado: z.coerce.boolean().default(false),
  metaTitle: z.string().trim().max(160).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

// Igual al de creación pero con todos los campos opcionales: el admin
// solo manda las columnas que quiere cambiar (PATCH parcial).
export const updateProductSchema = createProductSchema.partial();

export const updateStockSchema = z.object({
  stock: z.coerce.number().int().nonnegative(),
});
