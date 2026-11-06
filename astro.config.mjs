import { defineConfig } from 'astro/config';

// A static site: no adapter, no server. GitHub Pages serves dist/.
export default defineConfig({
  site: 'https://ny4rl4th0t3p.github.io',
  // The dev and preview servers listen on every interface, so the site can be opened from outside the VM.
  server: { host: true },
});