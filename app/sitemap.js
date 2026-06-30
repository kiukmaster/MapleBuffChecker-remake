import { SITE_URL } from '@/lib/seo';

export default function sitemap() {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/detect`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/detect2`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/update`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];
}
