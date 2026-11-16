import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timeorbit-chi.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/compare', '/clock', '/calendar', '/docs', '/login', '/register', '/wallpaper'],
        disallow: ['/admin', '/admin/*', '/api/admin/*', '/dashboard', '/dashboard/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
