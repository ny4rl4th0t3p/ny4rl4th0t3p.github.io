import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allPosts, postUrl } from '../../lib/posts';

// The findings as an RSS feed, at /blog/rss.xml.
export async function GET(context: APIContext) {
  const posts = await allPosts();
  return rss({
    title: 'ny4rl4th0t3p · Findings',
    description: 'Findings filed upstream or published with a full reproduction.',
    site: context.site ?? 'https://ny4rl4th0t3p.github.io',
    // The feed's own address, which feed readers use to confirm where it lives.
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: '<atom:link href="https://ny4rl4th0t3p.github.io/blog/rss.xml" rel="self" type="application/rss+xml" />',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
    })),
  });
}