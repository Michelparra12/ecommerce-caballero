import Link from 'next/link';
import { fetchProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export default async function HomePage() {
  const { data: destacados } = await fetchProducts({ limit: 8 });

  return (
    <main className="contenedor" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <h1>Accesorios de Caballero</h1>
      <p>Relojes, gafas, pulseras y zapatos con envíos a toda Colombia.</p>

      <div className="grid-productos" style={{ marginTop: '2rem' }}>
        {destacados.map((producto, index) => (
          <ProductCard key={producto.id} producto={producto} priority={index < 4} />
        ))}
      </div>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/productos">Ver catálogo completo →</Link>
      </p>
    </main>
  );
}
