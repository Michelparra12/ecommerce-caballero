export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  descripcion_corta: string | null;
  descripcion?: string | null;
  marca: string | null;
  precio: string;
  precio_comparacion: string | null;
  stock: number;
  imagen_principal_url: string | null;
  destacado: boolean;
  categoria_nombre: string;
  categoria_slug: string;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface Paginacion {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductosResponse {
  data: Producto[];
  pagination: Paginacion;
}

export interface ProductoFiltros {
  page?: number;
  limit?: number;
  categoriaId?: number;
  marca?: string;
  precioMin?: number;
  precioMax?: number;
  q?: string;
}

export interface Direccion {
  id: number;
  etiqueta: string;
  ciudad: string;
  departamento: string;
  direccion_linea: string;
  codigo_postal: string | null;
  es_predeterminada: boolean;
}

export type MetodoPago = 'pse' | 'nequi' | 'credit_card' | 'debit_card';

export interface Orden {
  id: number;
  numero_orden: string;
  estado: string;
  subtotal: string;
  costo_envio: string;
  total: string;
}

export interface IniciarPagoResponse {
  numeroOrden: string;
  wompiTransactionId: string;
  estado: string;
  asyncPaymentUrl: string | null;
}
