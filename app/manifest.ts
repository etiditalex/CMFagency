import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Changer Fusions - Marketing Agency Kenya',
    short_name: 'Changer Fusions',
    description: 'Kenya\'s premier marketing agency offering digital marketing, website development, branding, event management, and market research services.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        // Brand logo icons (PNG) for install prompts / PWA.
        src: '/favicons/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicons/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'marketing', 'advertising'],
    lang: 'en-KE',
    orientation: 'portrait',
    scope: '/',
  };
}
