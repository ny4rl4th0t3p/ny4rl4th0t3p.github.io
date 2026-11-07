// A full http(s) URL opens in a new tab, so a reader doesn't lose this site on the first click; that includes other
// projects published on this host. A root-relative link (/blog/) is a page of this site and keeps the tab. Decided at
// build time, so the page needs no script for it.

export function opensNewTab(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function linkAttrs(href: string): { target?: string; rel?: string } {
  return opensNewTab(href) ? { target: '_blank', rel: 'noopener' } : {};
}