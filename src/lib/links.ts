// Links to another host open in a new tab, so a reader doesn't lose this site on the first click. Links on this host
// (the landing, the blog, project docs published under it) keep the tab. Decided at build time, against the site's
// own address in astro.config.mjs, so the page needs no script for it.

const siteHost = new URL(import.meta.env.SITE).host;

export function linkAttrs(href: string): { target?: string; rel?: string } {
  const url = new URL(href, import.meta.env.SITE);
  return url.host === siteHost ? {} : { target: '_blank', rel: 'noopener' };
}