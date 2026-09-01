'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { Orden } from '@/lib/types';

const ESTADOS_FINALES = ['paid', 'cancelled', 'refunded'];

const MENSAJE_POR_ESTADO: Record<string, string> = {
  pending_payment: 'Estamos confirmando tu pago...',
  paid: '¡Pago confirmado! Te avisaremos por WhatsApp con la guía de envío.',
  processing: 'Tu pedido está siendo preparado.',
  shipped: 'Tu pedido ya fue despachado.',
  delivered: 'Tu pedido fue entregado.',
  cancelled: 'El pago no pudo procesarse. Intenta de nuevo o usa otro método.',
  refunded: 'Este pedido fue reembolsado.',
};

// El pago de Wompi se resuelve de forma ASÍNCRONA (llega por su webhook,
// no en la respuesta HTTP de iniciar el pago). Por eso esta página hace
// polling corto del estado de la orden en vez de asumir éxito inmediato.
export default function ResultadoCheckoutPage() {
  const searchParams = useSearchParams();
  const numeroOrden = searchParams.get('orden');
  const { getIdToken, loading: authLoading, user } = useAuth();

  const [orden, setOrden] = useState<Orden | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !numeroOrden) return;

    let cancelado = false;
    let intentos = 0;

    async function consultar() {
      const token = await getIdToken();
      try {
        const res = await apiClient.get<{ data: Orden }>(`/api/ordenes/numero/${numeroOrden}`, token);
        if (cancelado) return;
        setOrden(res.data);

        intentos += 1;
        // Deja de sondear al llegar a un estado final o tras ~1 minuto
        // (20 intentos x 3s) para no dejar un intervalo corriendo eterno
        // si el webhook nunca llega.
        if (!ESTADOS_FINALES.includes(res.data.estado) && intentos < 20) {
          setTimeout(consultar, 3000);
        }
      } catch {
        if (!cancelado) setError('No se pudo consultar el estado de la orden');
      }
    }

    consultar();
    return () => {
      cancelado = true;
    };
  }, [authLoading, user, numeroOrden, getIdToken]);

  if (!numeroOrden) {
    return (
      <main className="contenedor" style={{ paddingTop: '3rem' }}>
        <h1>Orden no especificada</h1>
        <Link href="/productos">Volver al catálogo →</Link>
      </main>
    );
  }

  return (
    <main className="contenedor" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: 480 }}>
      <h1>Pedido {numeroOrden}</h1>

      {error && <p style={{ color: '#e05252' }}>{error}</p>}

      {!orden && !error && <p>Consultando el estado de tu pedido...</p>}

      {orden && (
        <>
          <p style={{ fontSize: '1.1rem' }}>{MENSAJE_POR_ESTADO[orden.estado] ?? `Estado: ${orden.estado}`}</p>
          <p>
            Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(orden.total))}
          </p>
        </>
      )}

      <p style={{ marginTop: '2rem' }}>
        <Link href="/productos">Seguir comprando →</Link>
      </p>
    </main>
  );
}
