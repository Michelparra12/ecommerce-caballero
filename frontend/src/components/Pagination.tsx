import Link from 'next/link';
import type { Paginacion } from '@/lib/types';

// Enlaces reales (<a href>), no botones con onClick: cada página es una
// URL indexable, coherente con la filosofía SSR/SEO del resto del sitio.
export function Pagination({ pagination, basePath }: { pagination: Paginacion; basePath: string }) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) return null;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams({ page: String(targetPage) });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav aria-label="Paginación de productos" style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
      {page > 1 && (
        <Link href={buildHref(page - 1)} rel="prev">
          ← Anterior
        </Link>
      )}
      <span>
        Página {page} de {totalPages}
      </span>
      {page < totalPages && (
        <Link href={buildHref(page + 1)} rel="next">
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
