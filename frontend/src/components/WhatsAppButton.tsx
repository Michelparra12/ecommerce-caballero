interface WhatsAppButtonProps {
  phoneNumber: string; // formato E.164 sin '+', ej: 573001234567
  mensaje?: string;
}

// Componente estático (sin 'use client'): no necesita interactividad de
// React, es un <a> simple, así que se renderiza en el servidor sin
// costo de hidratación — mejor para Core Web Vitals (TBT/INP).
export function WhatsAppButton({ phoneNumber, mensaje = 'Hola, quiero más información sobre sus productos' }: WhatsAppButtonProps) {
  const href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(mensaje)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="boton-whatsapp"
      aria-label="Escríbenos por WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.85.505 3.583 1.383 5.07L2 22l5.06-1.361A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.524 2 12.001 2zm0 18.164a8.13 8.13 0 01-4.15-1.136l-.298-.177-3.014.81.805-2.94-.194-.303A8.14 8.14 0 013.836 12c0-4.507 3.657-8.164 8.165-8.164 4.507 0 8.163 3.657 8.163 8.164 0 4.508-3.656 8.164-8.163 8.164z" />
      </svg>
    </a>
  );
}
