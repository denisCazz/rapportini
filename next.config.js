/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Ottimizzazioni per Next.js 16.1
  experimental: {
    // Abilita ottimizzazioni del bundling
    optimizePackageImports: ['date-fns', 'jspdf', 'jszip'],
  },
  // Compressione migliorata
  compress: true,
  // Ottimizzazioni delle immagini (se usate in futuro)
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    const security = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];
    if (process.env.NODE_ENV === 'production') {
      security.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }
    // CSP base: adattare se aggiungi script inline o CDN
    security.push({
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    });
    return [
      {
        source: '/:path*',
        headers: security,
      },
    ];
  },
};

module.exports = nextConfig;
