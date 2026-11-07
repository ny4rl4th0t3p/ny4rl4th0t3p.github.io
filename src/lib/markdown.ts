// Additions to Astro's Markdown processor. Heading IDs stay Astro's: its own heading-ID plugin runs first here, so the
// section links can read the IDs, and Astro's final pass keeps them.
import { satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import { opensNewTab } from './links.ts';

interface Element {
  type?: string;
  tagName: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}

interface Context {
  setProperty(node: Element, key: string, value: unknown): void;
  appendChild(node: Element, child: Element): void;
}

// Links in posts follow the same rule as the rest of the site (links.ts).
const externalLinks = {
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node: Element, ctx: Context) {
      const href = node.properties?.href;
      if (typeof href === 'string' && opensNewTab(href)) {
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener');
      }
    },
  },
};

// A ¶ link at the end of each section heading, so a reader can copy a link to that section. The ¶ comes from CSS,
// keeping it out of the heading's text and so out of the table of contents.
const sectionLinks = {
  name: 'section-links',
  element: {
    filter: ['h2', 'h3', 'h4'],
    visit(node: Element, ctx: Context) {
      const id = node.properties?.id;
      if (typeof id !== 'string') return;
      ctx.appendChild(node, {
        type: 'element',
        tagName: 'a',
        properties: { href: `#${id}`, className: ['section-link'], ariaLabel: 'Link to this section' },
        children: [],
      });
    },
  },
};

export const postPlugins = [satteriHeadingIdsPlugin(), sectionLinks, externalLinks];
export const excerptPlugins = [externalLinks];