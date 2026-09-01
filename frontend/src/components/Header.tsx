'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';

export function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <header style={{ borderBottom: '1px solid #2a2a2c' }}>
      <div
        className="contenedor"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}
      >
        <Link href="/" style={{ fontWeight: 700, textDecoration: 'none' }}>
          Accesorios de Caballero
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/productos">Catálogo</Link>
          <Link href="/carrito">Carrito ({totalItems})</Link>
          {user ? (
            <button onClick={() => logout()} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              Salir ({user.email})
            </button>
          ) : (
            <Link href="/login">Ingresar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
