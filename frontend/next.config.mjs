/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-Side Rendering vía App Router (por defecto en Next.js).
  reactStrictMode: true,
  compress: true,
  // Genera un bundle mínimo autocontenido (server.js + node_modules
  // necesarios) para una imagen Docker liviana.
  output: 'standalone',

  images: {
    // Next optimiza y sirve automáticamente en WebP/AVIF con lazy
    // loading nativo en <Image>, clave para Core Web Vitals (LCP/CLS).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_CDN_HOSTNAME ?? 'cdn.tu-dominio.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
