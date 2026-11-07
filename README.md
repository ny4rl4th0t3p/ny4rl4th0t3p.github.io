# ny4rl4th0t3p.github.io

Source for [ny4rl4th0t3p.github.io](https://ny4rl4th0t3p.github.io), a static site built with Astro. Needs Node
22.23.4 or later.

```sh
npm ci
npm run dev       # http://localhost:4321, and on every interface (server.host in astro.config.mjs)
npm run build     # static site in dist/
npm run preview   # serves dist/
```

- `src/data/projects.ts`: the landing page's areas and projects.
- `src/content/posts/`: one Markdown file per finding, published at `/blog/<slug>/`. The front matter needs `title`,
  `description`, `slug`, `date` and `tags`; anything missing or extra fails the build. A `slug` never changes once
  published, because filed issues link to it. The text before `<!-- more -->` is the excerpt on `/blog/`.
- `/blog/rss.xml` is the feed of the findings.

Every push and pull request runs `.github/workflows/pages.yml`: it builds the site and checks its internal links and
section anchors offline with [lychee](https://github.com/lycheeverse/lychee). Pushes to `main` also deploy to GitHub
Pages.