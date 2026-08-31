import type { MetadataRoute } from 'next';
import { fetchProducts } from '@/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Sitemap dinámico generado en build/ISR: cada producto activo queda
// indexable sin mantenimiento manual del archivo XML.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: productos } = await fetchProducts({ limit: 100 });

  const productUrls = productos.map((p) => ({
    url: `${SITE_URL}/productos/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/productos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...productUrls,
  ];
}
