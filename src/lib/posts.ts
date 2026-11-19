import { getCollection, type CollectionEntry } from 'astro:content';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { excerptPlugins } from './markdown.ts';
import { findingsUrl, journalUrl } from '../data/projects';

export type Post = CollectionEntry<'posts'>;
export type Kind = Post['data']['kind'];

// Where each kind of post lives, and how its list and feed describe it.
export const kinds: Record<Kind, { url: string; title: string; summary: string; feed: string; read: string }> = {
  finding: {
    url: findingsUrl,
    title: 'Findings',
    summary:
      'One entry per finding that has been filed upstream or published with full reproduction. Each states the claim, the evidence, a reproduction anyone can run against public infrastructure, and the cause as the code says it.',
    feed: 'Findings filed upstream or published with a full reproduction.',
    read: 'Read the finding',
  },
  journal: {
    url: journalUrl,
    title: 'Journal',
    summary: 'A light development journal on the software I build: what each release built, measured and taught.',
    feed: 'A light development journal on the software I build: what each release built, measured and taught.',
    read: 'Read the entry',
  },
};

export const postUrl = (post: Post) => `${kinds[post.data.kind].url}${post.id}/`;

// Newest first.
export async function postsOf(kind: Kind): Promise<Post[]> {
  const posts = await getCollection('posts', (post) => post.data.kind === kind);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

// As MkDocs showed it: "Aug 4, 2026". Front matter dates are midnight UTC.
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const marker = '<!-- more -->';
// @ts-ignore
const excerptProcessor = await createSatteriMarkdownProcessor({ hastPlugins: excerptPlugins });

// The text before <!-- more -->, as HTML. Every post needs the marker, as it did under MkDocs.
export async function excerpt(post: Post): Promise<string> {
  const body = post.body ?? '';
  const end = body.indexOf(marker);
  if (end < 0) throw new Error(`${post.filePath}: no ${marker} marker`);
  return (await excerptProcessor.render(body.slice(0, end))).code;
}