import Image from 'next/image';
import Link from 'next/link';
import type { Producto } from '@/lib/types';

const PLACEHOLDER_IMG = '/placeholder-producto.svg';

export function ProductCard({ producto, priority = false }: { producto: Producto; priority?: boolean }) {
  return (
    <Link href={`/productos/${producto.slug}`} className="tarjeta-producto">
      <Image
        src={producto.imagen_principal_url || PLACEHOLDER_IMG}
        alt={producto.nombre}
        width={400}
        height={400}
        // 'priority' solo debe ir en imágenes above-the-fold (afecta LCP);
        // el resto usa lazy loading nativo de next/image por defecto.
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', objectFit: 'cover' }}
        sizes="(max-width: 768px) 50vw, 25vw"
      />
      <div className="tarjeta-producto__info">
        <p className="tarjeta-producto__nombre">{producto.nombre}</p>
        <p className="tarjeta-producto__precio">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
            Number(producto.precio)
          )}
        </p>
      </div>
    </Link>
  );
}
