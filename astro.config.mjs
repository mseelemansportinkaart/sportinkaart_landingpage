import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // The www host is the one that serves 200s; the apex 308-redirects to it,
  // so canonicals and the sitemap must point here.
  site: 'https://www.sportinkaart.nl',
  trailingSlash: 'never',
  output: 'static',
  integrations: [sitemap()],
});
