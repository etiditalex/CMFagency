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
        // Deterministic, local icon route (generated in `app/icon.tsx`)
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon',
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
