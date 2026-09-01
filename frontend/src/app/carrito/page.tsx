'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function CarritoPage() {
  const { items, updateCantidad, removeItem, subtotal } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <main className="contenedor" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        <h1>Tu carrito está vacío</h1>
        <p>
          <Link href="/productos">Ver catálogo →</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="contenedor" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <h1>Tu carrito</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        {items.map((item) => (
          <div key={item.productoId} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Image
              src={item.imagenUrl || '/placeholder-producto.svg'}
              alt={item.nombre}
              width={72}
              height={72}
              style={{ objectFit: 'cover', borderRadius: 6 }}
            />
            <div style={{ flex: 1 }}>
              <Link href={`/productos/${item.slug}`}>{item.nombre}</Link>
              <p style={{ color: 'var(--color-muted)' }}>{formatoCOP.format(item.precio)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.cantidad}
              onChange={(e) => updateCantidad(item.productoId, Number(e.target.value))}
              style={{ width: 60 }}
            />
            <button type="button" onClick={() => removeItem(item.productoId)}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
        <p style={{ fontSize: '1.25rem' }}>
          Subtotal: <strong>{formatoCOP.format(subtotal)}</strong>
        </p>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>+ envío calculado en el checkout</p>
        <button type="button" onClick={() => router.push('/checkout')}>
          Continuar al checkout
        </button>
      </div>
    </main>
  );
}
