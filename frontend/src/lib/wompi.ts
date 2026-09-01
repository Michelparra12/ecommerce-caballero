// Tokeniza los datos de tarjeta DIRECTAMENTE contra la API de Wompi
// desde el navegador, usando la llave pública. El número de tarjeta,
// CVC y fecha de expiración NUNCA se envían a nuestro propio backend —
// solo el token resultante (cardToken) llega a /api/pagos/:id/iniciar.
// Esto es lo que exige PCI-DSS: nuestro servidor jamás debe tocar datos
// de tarjeta en crudo.
const WOMPI_BASE_URL = process.env.NEXT_PUBLIC_WOMPI_BASE_URL ?? 'https://sandbox.wompi.co/v1';

export interface CardData {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export async function tokenizeCard(card: CardData): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error('Falta NEXT_PUBLIC_WOMPI_PUBLIC_KEY en la configuración del frontend');
  }

  const res = await fetch(`${WOMPI_BASE_URL}/tokens/cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${publicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: card.number.replace(/\s+/g, ''),
      cvc: card.cvc,
      exp_month: card.expMonth,
      exp_year: card.expYear,
      card_holder: card.cardHolder,
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error?.messages ? JSON.stringify(body.error.messages) : 'No se pudo validar la tarjeta');
  }

  return body.data.id as string;
}
