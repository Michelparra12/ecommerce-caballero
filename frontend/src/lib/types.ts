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
