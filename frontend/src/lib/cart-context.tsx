'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface CartItem {
  productoId: number;
  nombre: string;
  slug: string;
  precio: number;
  imagenUrl: string | null;
  cantidad: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cantidad'>, cantidad?: number) => void;
  updateCantidad: (productoId: number, cantidad: number) => void;
  removeItem: (productoId: number) => void;
  clear: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'carrito';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Se lee localStorage solo en el efecto (nunca en el render inicial):
  // el render inicial del cliente debe coincidir con el HTML del
  // servidor (que no conoce localStorage) para evitar un hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage puede fallar (modo privado, cuota) — el carrito
      // simplemente arranca vacío en ese caso.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Igual que arriba: si no se puede persistir, el carrito sigue
      // funcionando en memoria para el resto de la sesión.
    }
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, 'cantidad'>, cantidad = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productoId === item.productoId);
      if (existing) {
        return prev.map((i) => (i.productoId === item.productoId ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { ...item, cantidad }];
    });
  }

  function updateCantidad(productoId: number, cantidad: number) {
    if (cantidad <= 0) {
      removeItem(productoId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)));
  }

  function removeItem(productoId: number) {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  }

  function clear() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);
  const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateCantidad, removeItem, clear, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
