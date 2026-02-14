import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://agiera.net',
  vite: {
    build: {
      cssMinify: true,
    }
  }
});
