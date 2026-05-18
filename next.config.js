/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

function supabaseImageHostPattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    const h = new URL(raw).hostname
    return h ? { protocol: 'https', hostname: h, pathname: '/**' } : null
  } catch {
    return null
  }
}

const supabasePattern = supabaseImageHostPattern()
const imageRemotePatterns = [
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
  ...(supabasePattern ? [supabasePattern] : []),
]

const nextConfig = {
  // Tree-shake barrel imports (smaller client bundles for icon-heavy pages).
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
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






