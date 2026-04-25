# [TinyCranes](https://www.tinycranes.com/)

Personal website and blog. A Mithril SPA with build-time content compilation, deployed to GitHub Pages on push.

## Stack

- Mithril 2 + TypeScript. Parcel bundles, Bun installs and runs.
- Content authored as Markdown with YAML frontmatter. `scripts/build-content.ts` compiles posts and portfolio items into static TypeScript modules, emits `feed.xml` and `rss.xml`, and copies media into `dist/`.
- Syntax highlighting runs at build time via highlight.js (a11y-dark theme), so the client ships pre-tokenized HTML with no runtime highlighter.

## Development

```sh
bun install
bun run start      # dev server, rebuilds on content change
bun run build      # production build into dist/
bun run typecheck  # tsc --noEmit
```

## Content

- Blog posts: `content/posts/`, one Markdown file per post. Frontmatter requires `title` and `datetime`; set `preview: false` to opt out of list-view truncation. An example:

  ```markdown
  ---
  title: Second Test Post
  datetime: 2015-04-14 18:55:49 -0400
  preview: false
  ---
  Post body here...
  ```

- Portfolio items: `content/portfolio/<slug>/entry.md`. Asset directories and shared PDFs live under `content/portfolio/` alongside the slug folders.

## Deploy

Pushes to `master` trigger `.github/workflows/deploy.yml`. The workflow builds with Bun and publishes `dist/` to GitHub Pages. `index.html` is copied to `404.html` so the SPA handles deep links on direct load.

A single artifact serves both deployment targets. The workflow checks for a `CNAME` file at the repo root: if present, it builds with `--public-url /` and copies the file into the artifact so Pages serves at the custom domain. If absent, it builds with `--public-url /<repo>/` for the project-page subpath. The `<meta name="app-base">` in `index.html` is rewritten to match, and `source/with-base.ts` reads it at runtime to set Mithril's route prefix and prefix any root-absolute paths constructed at runtime.

To switch from project-page to custom domain:
1. Create a `CNAME` file at the repo root containing the apex or subdomain (e.g., `www.tinycranes.com`).
2. Configure DNS:
   - `CNAME` record `www` → `<github-username>.github.io`
   - `A` records for the apex pointing at `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Push. The workflow detects the CNAME, ships it, and serves at the custom domain. The github.io URL begins redirecting once the cert is provisioned.

## License

MIT. Copyright (c) 2016 Kevin Fung.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
