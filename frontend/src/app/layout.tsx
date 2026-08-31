import type { Metadata } from 'next';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Accesorios de Caballero | Relojes, gafas, pulseras y zapatos',
    template: '%s | Accesorios de Caballero',
  },
  description: 'Tienda online de accesorios de caballero: relojes, gafas, pulseras y zapatos con envíos a toda Colombia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        {/* Presente en todas las páginas vía layout raíz, como pide el requerimiento omnicanal */}
        <WhatsAppButton phoneNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '573001234567'} />
      </body>
    </html>
  );
}
