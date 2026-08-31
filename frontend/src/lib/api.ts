import type { ProductosResponse, ProductoFiltros, Producto } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Todas las llamadas al backend pasan por aquí. Se ejecutan en el
 * servidor (Server Components), por eso pueden usar `next.revalidate`
 * para ISR: el catálogo se regenera cada 60s sin necesidad de un
 * rebuild completo, manteniendo el SSR para SEO.
 */
export async function fetchProducts(filtros: ProductoFiltros = {}): Promise<ProductosResponse> {
  const params = new URLSearchParams();

  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });

  const res = await fetch(`${API_URL}/api/productos?${params.toString()}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Error al cargar productos: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductBySlug(slug: string): Promise<Producto | null> {
  const res = await fetch(`${API_URL}/api/productos/${slug}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error al cargar producto: ${res.status}`);

  const body = await res.json();
  return body.data;
}
