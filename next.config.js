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
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      // Disable powerful browser features unless explicitly needed.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      ...(isProd
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
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
    ],
  },
}

module.exports = nextConfig






