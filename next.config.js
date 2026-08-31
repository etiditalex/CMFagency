/** @type {import('next').NextConfig} */
const { allOptimizableImageHosts } = require('./lib/image-hosts')

const isProd = process.env.NODE_ENV === 'production'

const imageRemotePatterns = allOptimizableImageHosts().map((hostname) => ({
  protocol: 'https',
  hostname,
  pathname: '/**',
}))

const nextConfig = {
  // Tree-shake barrel imports (smaller client bundles for icon-heavy pages).
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
    turbopackUseSystemTlsCerts: true,
  },
  // Ensure Turbopack uses this project root (we have another lockfile on disk).
  turbopack: {
    root: __dirname,
  },
  // Typed routes generation has been flaky on Windows in this workspace.
  // Disabling it avoids `.next/dev/types` TypeScript failures during `next build`.
  typedRoutes: false,
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      // Allow camera for same-origin (Gate scanner); disable other powerful features unless needed.
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()',
      },
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
      // CSP nonce + strict-dynamic are set in `proxy.ts` (Next.js 16+ edge entry). Production script-src omits unsafe-eval.
    ]

    return [
      {
        source: '/downloads/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: imageRemotePatterns,
    // Prefer next-gen formats when supported by the browser/CDN edge.
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig






