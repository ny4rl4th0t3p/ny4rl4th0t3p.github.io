import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The posts. A post with a missing, misspelled or extra front matter field fails the build.
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: z.strictObject({
    title: z.string(),
    // One plain sentence, for search results, link previews and the feed.
    description: z.string(),
    // The URL is /blog/<slug>/. Filed issues link to these, so a slug never changes once published.
    slug: z.string().regex(/^[a-z0-9_-]+$/),
    date: z.coerce.date(),
    tags: z.array(z.string()).min(1),
  }),
});

export const collections = { posts };