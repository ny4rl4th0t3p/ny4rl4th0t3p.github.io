import type { APIContext } from 'astro';
import { feed } from '../../lib/feed';

// The journal as an RSS feed, at /journal/rss.xml.
export const GET = (context: APIContext) => feed(context, 'journal');