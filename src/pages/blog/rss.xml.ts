import type { APIContext } from 'astro';
import { feed } from '../../lib/feed';

// The findings as an RSS feed, at /blog/rss.xml.
export const GET = (context: APIContext) => feed(context, 'finding');