import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync } from "fs"
import { join, resolve } from "path"
import { marked } from "marked"

// Configure marked to match original site behavior
marked.setOptions({ breaks: true, gfm: true })

// Strip <script> blocks (they won't execute via m.trust/innerHTML anyway)
// and unwrap <noscript> blocks (SPA is all script-rendered, show fallback content)
function preprocessMarkdown(body: string): string {
    // Remove <script>...</script> blocks (including the tags)
    body = body.replace(/<script[\s\S]*?<\/script>/gi, "")

    // Unwrap <noscript>...</noscript> and unindent its content
    // (the original indentation causes marked to treat it as a code block)
    body = body.replace(/<noscript>([\s\S]*?)<\/noscript>/gi, (_match, inner: string) => {
        return inner.replace(/^    /gm, "")
    })

    return body
}

// Rewrite internal links for the SPA:
// - Strip trailing slashes from /blog/... paths (including before #fragment / ?query)
// - Convert absolute tinycranes.com URLs to relative paths
function rewriteLinks(html: string): string {
    // Absolute tinycranes.com URLs to relative. Scoped to href="..." so text
    // that happens to reference the domain literally (e.g. in <code> blocks)
    // isn't silently rewritten.
    html = html.replace(/href="https?:\/\/(?:www\.)?tinycranes\.com(\/[^"]*)"/g, 'href="$1"')

    // Strip a trailing slash from internal /blog/ links. Must handle three shapes:
    //   href="/blog/foo/"       -> href="/blog/foo"
    //   href="/blog/foo/#anchor" -> href="/blog/foo#anchor"
    //   href="/blog/foo/?q=1"    -> href="/blog/foo?q=1"
    // The lookahead keeps the following delimiter in place; without it, links
    // with fragments or query strings slipped through and hit the GH Pages
    // 404-as-index-html fallback, forcing a full page reload.
    html = html.replace(/href="(\/blog\/[^"#?]*?)\/(?=[#?"])/g, 'href="$1')

    return html
}

const ROOT = resolve(import.meta.dir, "..")
const CONTENT_DIR = join(ROOT, "content")
const POSTS_DIR = join(CONTENT_DIR, "posts")
const PORTFOLIO_DIR = join(CONTENT_DIR, "portfolio")
const OUTPUT_DIR = join(ROOT, "source", "content")
const DIST_DIR = join(ROOT, "dist")

// Canonical site timezone. Matches the pre-migration Heroku deployment so that
// posts authored around midnight local time keep their original day in the URL.
// Both the build and the DateDisplay runtime component resolve dates in this zone.
export const CANONICAL_TZ = "America/New_York"

// Portfolio link values in frontmatter are authored as relative paths
// (e.g. `fidelis/`, `documents/goliath.pdf`). Rewrite to absolute so they
// resolve regardless of which SPA route renders the card.
function normalizePortfolioLink(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) return value
    if (value.startsWith("mailto:") || value.startsWith("/")) return value
    return `/portfolio/${value}`
}

// Front matter parser: splits YAML header from markdown body
function parseFrontMatter(raw: string): { attributes: Record<string, unknown>; body: string } {
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!match) return { attributes: {}, body: raw }

    const yamlBlock = match[1]!
    const body = match[2]!
    const attributes: Record<string, unknown> = {}

    // Parse YAML key-value pairs, including nested maps (for links)
    let currentKey: string | null = null
    let nestedMap: Record<string, string> | null = null

    for (const line of yamlBlock.split("\n")) {
        // Nested map value (indented key: value)
        const nestedMatch = line.match(/^    (\w[\w &]*?):\s*(.+)$/)
        if (nestedMatch && currentKey && nestedMap) {
            nestedMap[nestedMatch[1]!] = nestedMatch[2]!.trim()
            continue
        }

        // Flush any pending nested map
        if (currentKey && nestedMap) {
            attributes[currentKey] = nestedMap
            nestedMap = null
            currentKey = null
        }

        // Top-level key: value
        const topMatch = line.match(/^(\w+):\s*(.*)$/)
        if (topMatch) {
            const key = topMatch[1]!
            const value = topMatch[2]!.trim()
            if (value === "") {
                // Start of a nested map
                currentKey = key
                nestedMap = {}
            } else {
                attributes[key] = value
            }
        }
    }

    // Flush trailing nested map
    if (currentKey && nestedMap) {
        attributes[currentKey] = nestedMap
    }

    return { attributes, body }
}

// Slugify a title string
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .trim()
}

// Collect markdown files recursively
function collectMarkdownFiles(directory: string): string[] {
    const results: string[] = []
    function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                walk(join(dir, entry.name))
            } else if (entry.name.endsWith(".md")) {
                results.push(join(dir, entry.name))
            }
        }
    }
    walk(directory)
    return results
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

// Render the first markdown paragraph, strip HTML tags, collapse whitespace,
// truncate to `max` chars on a word boundary with an ellipsis. Used for RSS
// descriptions and per-post meta description.
function summarizeForFeed(body: string, max: number = 200): string {
    const firstParagraph = body.split(/\n\s*\n/)[0] ?? ""
    const rendered = marked.parse(firstParagraph) as string
    const plain = rendered.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    if (plain.length <= max) return plain
    const cut = plain.substring(0, max)
    const lastSpace = cut.lastIndexOf(" ")
    return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + "\u2026"
}

// Resolve ISO datetime into year/month/day components in the canonical site
// timezone so build-machine TZ doesn't split URLs across environments.
function dateParts(datetime: Date): { year: string; month: string; day: string; monthName: string } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CANONICAL_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(datetime)
    const year = parts.find(p => p.type === "year")!.value
    const month = parts.find(p => p.type === "month")!.value
    const day = parts.find(p => p.type === "day")!.value
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1]!
    return { year, month, day, monthName }
}

// Build blog posts
function buildPosts(): void {
    const files = collectMarkdownFiles(POSTS_DIR)
    const posts: Array<Record<string, unknown>> = []

    for (const filepath of files) {
        const raw = readFileSync(filepath, "utf-8")
        const { attributes, body: rawBody } = parseFrontMatter(raw)

        // Validate required fields loudly. Missing title was silently producing
        // slug "undefined"; missing datetime becomes Invalid Date which cascades
        // to year "NaN" and a broken URL.
        if (typeof attributes.title !== "string" || !attributes.title) {
            throw new Error(`Missing title in ${filepath}`)
        }
        if (typeof attributes.datetime !== "string" || !attributes.datetime) {
            throw new Error(`Missing datetime in ${filepath}`)
        }

        const title = attributes.title
        const datetime = new Date(attributes.datetime)
        const image = (attributes.image as string) ?? null

        const { year, month, day, monthName } = dateParts(datetime)
        const slug = slugify(title)

        // Strip scripts and unwrap noscript before markdown processing
        const body = preprocessMarkdown(rawBody)

        const description = summarizeForFeed(body)

        // Auto-generate preview for long posts (render first paragraph as HTML)
        const previewHtml = body.length > 1500
            ? rewriteLinks(marked.parse(body.split(/\n\s*\n/)[0] ?? "") as string)
            : null

        // Convert full body from markdown to HTML, then fix internal links
        const bodyHtml = rewriteLinks(marked.parse(body) as string)

        posts.push({ title, slug, datetime: datetime.toISOString(), year, month, monthName, day, image, description, preview: previewHtml, body: bodyHtml })
    }

    // Sort newest first
    posts.sort((a, b) => new Date(b.datetime as string).getTime() - new Date(a.datetime as string).getTime())

    // Escape backticks and backslashes for template literal embedding
    function escapeForTemplate(text: string): string {
        return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
    }

    const lines = [
        `import type { Post } from "./types"\n`,
        `export const posts: Post[] = [`,
    ]

    for (const post of posts) {
        lines.push(`    {`)
        lines.push(`        title: ${JSON.stringify(post.title)},`)
        lines.push(`        slug: ${JSON.stringify(post.slug)},`)
        lines.push(`        datetime: ${JSON.stringify(post.datetime)},`)
        lines.push(`        year: ${JSON.stringify(post.year)},`)
        lines.push(`        month: ${JSON.stringify(post.month)},`)
        lines.push(`        monthName: ${JSON.stringify(post.monthName)},`)
        lines.push(`        day: ${JSON.stringify(post.day)},`)
        lines.push(`        image: ${JSON.stringify(post.image)},`)
        lines.push(`        description: ${JSON.stringify(post.description)},`)
        lines.push(`        preview: ${post.preview ? JSON.stringify(post.preview) : "null"},`)
        lines.push(`        body: \`${escapeForTemplate(post.body as string)}\`,`)
        lines.push(`    },`)
    }

    lines.push(`]\n`)

    writeFileSync(join(OUTPUT_DIR, "posts.ts"), lines.join("\n"))
    console.log(`Built ${posts.length} posts`)

    // Generate RSS feed
    buildRssFeed(posts)
}

// Build portfolio items
function buildPortfolio(): void {
    // Maintain original display order
    const slugOrder = [
        "hunt-and-peck", "flows", "yesterday", "winter", "sticks-and-stones",
        "trajectory", "fidelis", "midnight", "overburdened", "goliath",
        "footsteps", "apostrophe", "vertigo", "rotary", "monotony",
        "lost-manuscript", "mockingbird",
    ]

    function escapeForTemplate(text: string): string {
        return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
    }

    const lines = [
        `import type { PortfolioItem } from "./types"\n`,
        `export const portfolio: PortfolioItem[] = [`,
    ]

    for (const slug of slugOrder) {
        const filepath = join(PORTFOLIO_DIR, `${slug}.md`)
        if (!existsSync(filepath)) {
            console.warn(`Warning: portfolio file not found: ${slug}.md`)
            continue
        }
        const raw = readFileSync(filepath, "utf-8")
        const { attributes, body } = parseFrontMatter(raw)

        const title = attributes.title as string
        const subtitle = (attributes.subtitle as string) ?? ""
        const image = (attributes.image as string) ?? null
        const rawLinks = (attributes.links as Record<string, string>) ?? {}
        const links: Record<string, string> = {}
        for (const [label, url] of Object.entries(rawLinks)) {
            links[label] = normalizePortfolioLink(url)
        }

        lines.push(`    {`)
        lines.push(`        title: ${JSON.stringify(title)},`)
        lines.push(`        subtitle: ${JSON.stringify(subtitle)},`)
        lines.push(`        slug: ${JSON.stringify(slug)},`)
        lines.push(`        image: ${JSON.stringify(image)},`)
        lines.push(`        links: ${JSON.stringify(links)},`)
        const bodyHtml = rewriteLinks(marked.parse(body.trim()) as string)
        lines.push(`        body: \`${escapeForTemplate(bodyHtml)}\`,`)
        lines.push(`    },`)
    }

    lines.push(`]\n`)

    writeFileSync(join(OUTPUT_DIR, "portfolio.ts"), lines.join("\n"))
    console.log(`Built ${slugOrder.length} portfolio items`)
}

// Generate RSS feed XML
function buildRssFeed(posts: Array<Record<string, unknown>>): void {
    if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true })

    const feedUrl = "https://www.tinycranes.com/feed.xml"
    const managingEditor = "kfung@tinycranes.com (Kevin Fung)"

    const recentPosts = posts.slice(0, 20)
    // Pin lastBuildDate to the newest post so unrelated CI runs don't produce
    // phantom feed updates.
    const lastBuildDate = recentPosts[0]
        ? new Date(recentPosts[0].datetime as string).toUTCString()
        : new Date(0).toUTCString()

    const items = recentPosts.map(post => {
        // No trailing slash: matches the SPA's canonical form (index.ts strips
        // trailing slashes), so feed-reader clicks land on the canonical URL.
        const link = `https://www.tinycranes.com/blog/${post.year}/${post.month}/${post.slug}`
        // CDATA cannot contain a literal `]]>`; split any occurrence.
        const body = (post.body as string).replaceAll("]]>", "]]]]><![CDATA[>")
        return [
            `        <item>`,
            `            <title>${escapeXml(post.title as string)}</title>`,
            `            <link>${link}</link>`,
            `            <guid isPermaLink="true">${link}</guid>`,
            `            <pubDate>${new Date(post.datetime as string).toUTCString()}</pubDate>`,
            `            <author>${escapeXml(managingEditor)}</author>`,
            `            <description>${escapeXml(post.description as string)}</description>`,
            `            <content:encoded><![CDATA[${body}]]></content:encoded>`,
            `        </item>`,
        ].join("\n")
    })

    const feed = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
        `    <channel>`,
        `        <title>TinyCranes</title>`,
        `        <link>https://www.tinycranes.com</link>`,
        `        <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
        `        <description>Software design and development by Kevin Fung</description>`,
        `        <language>en-us</language>`,
        `        <managingEditor>${escapeXml(managingEditor)}</managingEditor>`,
        `        <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
        ...items,
        `    </channel>`,
        `</rss>`,
    ].join("\n")

    writeFileSync(join(DIST_DIR, "feed.xml"), feed)
    // Preserve the pre-migration URL for existing subscribers.
    writeFileSync(join(DIST_DIR, "rss.xml"), feed)
    console.log("Built RSS feed")
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

// Copy content-authored static assets into dist so Parcel's hashed bundles
// share the output tree with post uploads, portfolio media, legacy games,
// and the avatar. Unifies local and CI builds.
function copyStaticAssets(): void {
    if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true })

    cpSync(join(CONTENT_DIR, "uploads"), join(DIST_DIR, "uploads"), { recursive: true })
    cpSync(join(CONTENT_DIR, "portfolio/assets"), join(DIST_DIR, "portfolio/assets"), { recursive: true })

    // Only ship PDFs from portfolio/documents; the .indd source file is 1.5 MB
    // and has no web use.
    cpSync(
        join(CONTENT_DIR, "portfolio/documents"),
        join(DIST_DIR, "portfolio/documents"),
        { recursive: true, filter: (source) => !source.endsWith(".indd") },
    )

    // Legacy Twine/Unity game bundles. Fidelis still works; the three Unity
    // games show a disabled Play button but the pages themselves remain.
    for (const slug of ["fidelis", "winter", "overburdened", "hunt-and-peck"]) {
        cpSync(join(CONTENT_DIR, "portfolio", slug), join(DIST_DIR, "portfolio", slug), { recursive: true })
    }

    // Avatar currently lives in the legacy browser/ tree; move to a non-legacy
    // location when that directory is removed.
    copyFileSync(join(ROOT, "browser/avatar.jpg"), join(DIST_DIR, "avatar.jpg"))

    console.log("Copied static assets")
}

// Run
buildPosts()
buildPortfolio()
copyStaticAssets()
