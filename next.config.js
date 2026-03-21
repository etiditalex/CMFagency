/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
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
        value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
      // CSP is set per-request in middleware (proxy.ts) with nonce + strict-dynamic — no unsafe-inline/unsafe-eval on scripts in production.
    ]

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig






