import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { fetchProductBySlug } from '@/lib/api';

interface PageProps {
  params: { slug: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// SEO técnico: title/description dinámicos por producto, con fallback
// a meta_title/meta_description si el equipo de marketing los sobrescribió
// manualmente en el admin. Next.js inyecta esto en el <head> del HTML
// servido por el servidor (no via JS del cliente), visible a cualquier crawler.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const producto = await fetchProductBySlug(params.slug);

  if (!producto) return {};

  const title = producto.meta_title || producto.nombre;
  const description = producto.meta_description || producto.descripcion_corta || producto.nombre;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/productos/${producto.slug}` },
    openGraph: {
      title,
      description,
      images: producto.imagen_principal_url ? [producto.imagen_principal_url] : [],
      type: 'website',
    },
  };
}

export default async function ProductoDetallePage({ params }: PageProps) {
  const producto = await fetchProductBySlug(params.slug);

  if (!producto) notFound();

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    image: producto.imagen_principal_url ? [producto.imagen_principal_url] : [],
    description: producto.descripcion_corta || producto.nombre,
    sku: producto.sku,
    brand: { '@type': 'Brand', name: producto.marca || 'Genérico' },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/productos/${producto.slug}`,
      priceCurrency: 'COP',
      price: producto.precio,
      availability: producto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: producto.categoria_nombre,
        item: `${SITE_URL}/categorias/${producto.categoria_slug}`,
      },
      { '@type': 'ListItem', position: 3, name: producto.nombre, item: `${SITE_URL}/productos/${producto.slug}` },
    ],
  };

  return (
    <main className="contenedor" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* JSON-LD renderizado en el servidor: llega al HTML inicial, sin
          depender de que Google ejecute JavaScript para verlo. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="breadcrumb" style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
        Inicio / {producto.categoria_nombre} / {producto.nombre}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <Image
          src={producto.imagen_principal_url || '/placeholder-producto.svg'}
          alt={producto.nombre}
          width={600}
          height={600}
          priority
          style={{ width: '100%', height: 'auto' }}
        />

        <div>
          <h1>{producto.nombre}</h1>
          <p style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontWeight: 700 }}>
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
              Number(producto.precio)
            )}
          </p>
          <p>{producto.descripcion_corta}</p>
          <p>
            {producto.stock > 0 ? `Disponible (${producto.stock} en stock)` : 'Agotado'}
          </p>
        </div>
      </div>
    </main>
  );
}
