'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { tokenizeCard } from '@/lib/wompi';
import type { Direccion, MetodoPago, Orden, IniciarPagoResponse } from '@/lib/types';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Códigos reales de Wompi para PSE. En producción esta lista se debe
// pedir en vivo a GET https://sandbox.wompi.co/v1/pse/financial_institutions
// (cambian y Wompi puede agregar/quitar bancos); se hardcodea acá un
// subconjunto para que el formulario sea funcional sin esa llamada extra.
const BANCOS_PSE = [
  { codigo: '1', nombre: 'Banco de Bogotá' },
  { codigo: '1007', nombre: 'Bancolombia' },
  { codigo: '1051', nombre: 'Davivienda' },
  { codigo: '1013', nombre: 'BBVA Colombia' },
  { codigo: '1002', nombre: 'Banco Popular' },
  { codigo: '1019', nombre: 'Scotiabank Colpatria' },
];

export default function CheckoutPage() {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionId, setDireccionId] = useState<number | 'nueva'>('nueva');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [direccionLinea, setDireccionLinea] = useState('');

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('nequi');

  // PSE
  const [userType, setUserType] = useState<'natural' | 'juridica'>('natural');
  const [userLegalIdType, setUserLegalIdType] = useState<'CC' | 'CE' | 'NIT'>('CC');
  const [userLegalId, setUserLegalId] = useState('');
  const [financialInstitutionCode, setFinancialInstitutionCode] = useState(BANCOS_PSE[0].codigo);

  // Nequi
  const [phoneNumber, setPhoneNumber] = useState('');

  // Tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [installments, setInstallments] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [pasoActual, setPasoActual] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await getIdToken();
      try {
        const res = await apiClient.get<{ data: Direccion[] }>('/api/direcciones', token);
        setDirecciones(res.data);
        if (res.data.length > 0) setDireccionId(res.data[0].id);
      } catch {
        // si falla el listado, el usuario igual puede crear una nueva dirección
      }
    })();
  }, [user, getIdToken]);

  if (authLoading) return null;

  if (!user) {
    return (
      <main className="contenedor" style={{ paddingTop: '3rem' }}>
        <h1>Inicia sesión para continuar</h1>
        <p>
          <Link href="/login">Ir a login →</Link>
        </p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="contenedor" style={{ paddingTop: '3rem' }}>
        <h1>Tu carrito está vacío</h1>
        <p>
          <Link href="/productos">Ver catálogo →</Link>
        </p>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProcesando(true);

    try {
      const token = await getIdToken();

      // 1. Resolver dirección: crear una nueva si el usuario no eligió
      // una existente.
      let resolvedDireccionId: number;
      if (direccionId === 'nueva') {
        setPasoActual('Guardando dirección...');
        const res = await apiClient.post<{ data: Direccion }>(
          '/api/direcciones',
          { ciudad, departamento, direccionLinea, esPredeterminada: direcciones.length === 0 },
          token
        );
        resolvedDireccionId = res.data.id;
      } else {
        resolvedDireccionId = direccionId;
      }

      // 2. Crear la orden: precios/stock se validan y congelan en el
      // backend, acá solo se manda qué y cuánto.
      setPasoActual('Creando tu orden...');
      const ordenRes = await apiClient.post<{ data: Orden }>(
        '/api/ordenes',
        {
          direccionId: resolvedDireccionId,
          metodoPago,
          items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        },
        token
      );
      const orden = ordenRes.data;

      // 3. Armar el body de pago según el método (cada uno exige campos
      // distintos, ver payment.validators.js en el backend).
      setPasoActual(metodoPago.includes('card') ? 'Verificando tarjeta...' : 'Iniciando pago...');
      let paymentDetails: Record<string, unknown>;

      if (metodoPago === 'pse') {
        paymentDetails = { userType, userLegalIdType, userLegalId, financialInstitutionCode };
      } else if (metodoPago === 'nequi') {
        paymentDetails = { phoneNumber };
      } else {
        // Tokeniza CONTRA WOMPI directamente desde el navegador — el
        // número de tarjeta nunca toca nuestro backend.
        const cardToken = await tokenizeCard({
          number: cardNumber,
          cvc: cardCvc,
          expMonth: cardExpMonth,
          expYear: cardExpYear,
          cardHolder,
        });
        paymentDetails = { cardToken, installments };
      }

      setPasoActual('Procesando pago...');
      const pago = await apiClient.post<{ data: IniciarPagoResponse }>(
        `/api/pagos/${orden.id}/iniciar`,
        paymentDetails,
        token
      );

      clear();

      // PSE redirige al sitio del banco para autorizar el pago; Nequi y
      // tarjeta resuelven de forma asíncrona vía el webhook de Wompi, así
      // que se manda al cliente a la página que hace polling del estado.
      if (pago.data.asyncPaymentUrl) {
        window.location.href = pago.data.asyncPaymentUrl;
      } else {
        router.push(`/checkout/resultado?orden=${pago.data.numeroOrden}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Ocurrió un error al procesar el pago');
      }
      setProcesando(false);
      setPasoActual(null);
    }
  }

  const costoEnvio = 12000;
  const total = subtotal + costoEnvio;

  return (
    <main className="contenedor" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 640 }}>
      <h1>Checkout</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        <fieldset>
          <legend>Dirección de envío</legend>

          {direcciones.length > 0 && (
            <select
              value={direccionId}
              onChange={(e) => setDireccionId(e.target.value === 'nueva' ? 'nueva' : Number(e.target.value))}
            >
              {direcciones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.etiqueta}: {d.direccion_linea}, {d.ciudad}
                </option>
              ))}
              <option value="nueva">+ Nueva dirección</option>
            </select>
          )}

          {direccionId === 'nueva' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input placeholder="Dirección (calle, número, barrio)" value={direccionLinea} onChange={(e) => setDireccionLinea(e.target.value)} required />
              <input placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
              <input placeholder="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)} required />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Método de pago</legend>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
            <label>
              <input type="radio" checked={metodoPago === 'nequi'} onChange={() => setMetodoPago('nequi')} /> Nequi
            </label>
            <label>
              <input type="radio" checked={metodoPago === 'pse'} onChange={() => setMetodoPago('pse')} /> PSE
            </label>
            <label>
              <input type="radio" checked={metodoPago === 'credit_card'} onChange={() => setMetodoPago('credit_card')} /> Tarjeta
            </label>
          </div>

          {metodoPago === 'nequi' && (
            <input
              placeholder="Celular Nequi (ej: 3001234567)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              pattern="3\d{9}"
              required
            />
          )}

          {metodoPago === 'pse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select value={userType} onChange={(e) => setUserType(e.target.value as 'natural' | 'juridica')}>
                <option value="natural">Persona natural</option>
                <option value="juridica">Persona jurídica</option>
              </select>
              <select value={userLegalIdType} onChange={(e) => setUserLegalIdType(e.target.value as 'CC' | 'CE' | 'NIT')}>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="NIT">NIT</option>
              </select>
              <input placeholder="Número de documento" value={userLegalId} onChange={(e) => setUserLegalId(e.target.value)} required />
              <select value={financialInstitutionCode} onChange={(e) => setFinancialInstitutionCode(e.target.value)}>
                {BANCOS_PSE.map((b) => (
                  <option key={b.codigo} value={b.codigo}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(metodoPago === 'credit_card' || metodoPago === 'debit_card') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input placeholder="Nombre del titular" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} required />
              <input placeholder="Número de tarjeta" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input placeholder="MM" maxLength={2} value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value)} required />
                <input placeholder="AA" maxLength={2} value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value)} required />
                <input placeholder="CVC" maxLength={4} value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} required />
              </div>
              <label>
                Cuotas:{' '}
                <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                  {[1, 3, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </fieldset>

        <div>
          <p>Subtotal: {formatoCOP.format(subtotal)}</p>
          <p>Envío: {formatoCOP.format(costoEnvio)}</p>
          <p style={{ fontWeight: 700 }}>Total: {formatoCOP.format(total)}</p>
        </div>

        {error && <p style={{ color: '#e05252' }}>{error}</p>}

        <button type="submit" disabled={procesando}>
          {procesando ? pasoActual ?? 'Procesando...' : `Pagar ${formatoCOP.format(total)}`}
        </button>
      </form>
    </main>
  );
}
