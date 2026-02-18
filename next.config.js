/** @type {import('next').NextConfig} */
const nextConfig = {
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
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" },
        ],
      },
    ];
  },
}

module.exports = nextConfig
