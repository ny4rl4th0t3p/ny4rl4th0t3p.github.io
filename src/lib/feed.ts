import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { kinds, postUrl, postsOf, type Kind } from './posts';

const site = 'https://ny4rl4th0t3p.github.io';

// One kind of post as an RSS feed, at <its list>/rss.xml.
export async function feed(context: APIContext, kind: Kind): Promise<Response> {
  const { url, title, feed: description } = kinds[kind];
  const posts = await postsOf(kind);
  return rss({
    title: `ny4rl4th0t3p · ${title}`,
    description,
    site: context.site ?? site,
    // The feed's own address, which feed readers use to confirm where it lives.
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<atom:link href="${site}${url}rss.xml" rel="self" type="application/rss+xml" />`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
    })),
  });
}