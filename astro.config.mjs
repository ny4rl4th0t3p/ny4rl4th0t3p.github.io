import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { opensNewTab } from './src/lib/links.ts';

// Links in posts follow the same rule as the rest of the site (src/lib/links.ts).
const externalLinks = {
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href === 'string' && opensNewTab(href)) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener');
      }
    },
  },
};

// A static site: no adapter, no server. GitHub Pages serves dist/.
export default defineConfig({
  site: 'https://ny4rl4th0t3p.github.io',
  // The dev and preview servers listen on every interface, so the site can be opened from outside the VM.
  server: { host: true },
  // Astro's default Markdown processor, with one plugin added.
  markdown: {
    processor: satteri({ hastPlugins: [externalLinks] }),
  },
});