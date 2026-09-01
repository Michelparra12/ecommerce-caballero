'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';

// Único punto client-side del árbol: agrupa los contextos que necesitan
// estado en el navegador (sesión, carrito) para que layout.tsx siga
// siendo un Server Component y el resto de la app (catálogo, SEO) no
// pague el costo de hidratación innecesariamente.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
