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
        src: 'https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg',
        sizes: 'any',
        type: 'image/jpeg',
      },
      {
        src: 'https://res.cloudinary.com/dyfnobo9r/image/upload/v1766134130/changer_fusions_dyb52h.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'marketing', 'advertising'],
    lang: 'en-KE',
    orientation: 'portrait',
    scope: '/',
  };
}
