import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { postPlugins } from './src/lib/markdown.ts';

// A static site: no adapter, no server. GitHub Pages serves dist/.
export default defineConfig({
  site: 'https://ny4rl4th0t3p.github.io',
  // The dev and preview servers listen on every interface, so the site can be opened from outside the VM.
  server: { host: true },
  markdown: {
    // Astro's default Markdown processor, with the additions in src/lib/markdown.ts.
    processor: satteri({ hastPlugins: postPlugins }),
    // Code colors for both themes; global.css picks one.
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});