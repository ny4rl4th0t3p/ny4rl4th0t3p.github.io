import { getCollection, type CollectionEntry } from 'astro:content';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { excerptPlugins } from './markdown.ts';

export type Post = CollectionEntry<'posts'>;

export const postUrl = (post: Post) => `/blog/${post.id}/`;

// Newest first.
export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

// As MkDocs showed it: "Aug 4, 2026". Front matter dates are midnight UTC.
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const marker = '<!-- more -->';
const excerptProcessor = await createSatteriMarkdownProcessor({ hastPlugins: excerptPlugins });

// The text before <!-- more -->, as HTML. Every post needs the marker, as it did under MkDocs.
export async function excerpt(post: Post): Promise<string> {
  const body = post.body ?? '';
  const end = body.indexOf(marker);
  if (end < 0) throw new Error(`${post.filePath}: no ${marker} marker`);
  return (await excerptProcessor.render(body.slice(0, end))).code;
}