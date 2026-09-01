'use client';

import { useCart } from '@/lib/cart-context';

interface AddToCartButtonProps {
  productoId: number;
  nombre: string;
  slug: string;
  precio: number;
  imagenUrl: string | null;
  cantidad?: number;
}

// Único pedazo de ProductCard que necesita ser Client Component: el
// carrito vive en localStorage, así que ProductCard sigue siendo un
// Server Component (SSR completo del catálogo para SEO) y solo este
// botón se hidrata.
export function AddToCartButton({ productoId, nombre, slug, precio, imagenUrl, cantidad = 1 }: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        addItem({ productoId, nombre, slug, precio, imagenUrl }, cantidad);
      }}
    >
      Agregar al carrito
    </button>
  );
}
