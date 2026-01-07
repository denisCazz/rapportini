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
}

module.exports = nextConfig
