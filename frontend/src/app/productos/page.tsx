import type { Metadata } from 'next';
import { fetchProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = {
  title: 'Catálogo de accesorios',
  description: 'Relojes, gafas, pulseras y zapatos para caballero. Envíos a toda Colombia.',
};

interface PageProps {
  searchParams: {
    page?: string;
    marca?: string;
    precioMin?: string;
    precioMax?: string;
    q?: string;
    categoriaId?: string;
  };
}

// Server Component: se ejecuta en el servidor en cada request (con
// revalidate del lado del fetch), el HTML ya llega con los productos
// renderizados — nada de "loading..." para los crawlers de Google.
export default async function ProductosPage({ searchParams }: PageProps) {
  const { data: productos, pagination } = await fetchProducts({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    marca: searchParams.marca,
    precioMin: searchParams.precioMin ? Number(searchParams.precioMin) : undefined,
    precioMax: searchParams.precioMax ? Number(searchParams.precioMax) : undefined,
    q: searchParams.q,
    categoriaId: searchParams.categoriaId ? Number(searchParams.categoriaId) : undefined,
  });

  return (
    <main className="contenedor" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <h1>Catálogo de accesorios</h1>

      <form method="get" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
        <input type="search" name="q" placeholder="Buscar..." defaultValue={searchParams.q} />
        <input type="number" name="precioMin" placeholder="Precio mín." defaultValue={searchParams.precioMin} />
        <input type="number" name="precioMax" placeholder="Precio máx." defaultValue={searchParams.precioMax} />
        <button type="submit">Filtrar</button>
      </form>

      <div className="grid-productos">
        {productos.map((producto, index) => (
          // Solo las primeras tarjetas (above the fold) van con priority,
          // para no competir por ancho de banda con el LCP real.
          <ProductCard key={producto.id} producto={producto} priority={index < 4} />
        ))}
      </div>

      {productos.length === 0 && <p>No se encontraron productos con esos filtros.</p>}

      <Pagination pagination={pagination} basePath="/productos" />
    </main>
  );
}
