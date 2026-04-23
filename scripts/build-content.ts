import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync, watch } from "fs"
import { join, resolve } from "path"
import { marked, Renderer } from "marked"
import { markedHighlight } from "marked-highlight"
import hljs from "highlight.js/lib/core"
import cpp from "highlight.js/lib/languages/cpp"
import c from "highlight.js/lib/languages/c"
import bash from "highlight.js/lib/languages/bash"
import type { Post, PortfolioItem } from "../source/content/types"

// Register only the languages our posts use. Keeps the build's grammar surface
// tight and documents what fence tags are supported in content.
hljs.registerLanguage("cpp", cpp)
hljs.registerLanguage("c", c)
hljs.registerLanguage("bash", bash)

// Syntax highlighting runs at build time; pages ship pre-tokenized HTML with
// class names, so no highlighter JS loads in the browser. The a11y-dark theme
// CSS in source/index.css applies the colors.
marked.use(markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
        const normalized = lang === "c++" ? "cpp" : lang
        const language = normalized && hljs.getLanguage(normalized) ? normalized : "plaintext"
        return hljs.highlight(code, { language }).value
    },
}))

// Annotate external links with target=_blank + rel=noopener noreferrer so
// marked-rendered anchors in post bodies match the hardening already applied
// to Mithril-authored externals. Calls the default renderer to keep href/text
// escaping intact, then prefixes the opening tag.
function isExternalUrl(href: string): boolean {
    if (!href.startsWith("http://") && !href.startsWith("https://")) return false
    return !href.includes("tinycranes.com")
}
const defaultRenderer = new Renderer()
marked.use({
    renderer: {
        link(token) {
            const html = defaultRenderer.link.call(this, token)
            if (!html.startsWith("<a ")) return html
            if (!isExternalUrl(token.href)) return html
            return `<a target="_blank" rel="noopener noreferrer" ${html.slice(3)}`
        },
    },
})

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

// Convert absolute tinycranes.com URLs in href attributes to site-relative
// paths. Scoped to href="..." so text that happens to reference the domain
// literally (e.g. in <code> blocks) isn't silently rewritten. Trailing
// slashes are preserved as-is: canonical URLs on this site include them.
function rewriteLinks(html: string): string {
    return html.replace(/href="https?:\/\/(?:www\.)?tinycranes\.com(\/[^"]*)"/g, 'href="$1"')
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

// Escape backticks, backslashes, and template-literal interpolation so a rendered
// HTML body can be embedded in a ${`...`} template in the generated TS modules.
function escapeForTemplate(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
}

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
    const rendered = marked.parse(firstParagraph, { async: false })
    const plain = rendered.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    if (plain.length <= max) return plain
    const cut = plain.substring(0, max)
    const lastSpace = cut.lastIndexOf(" ")
    return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + "\u2026"
}

// Resolve ISO datetime into year/month components in the canonical site timezone
// so build-machine TZ doesn't split URLs across environments. Day is not
// emitted (no view renders it; DateDisplay reformats datetime at runtime).
function dateParts(datetime: Date): { year: string; month: string; monthName: string } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CANONICAL_TZ,
        year: "numeric",
        month: "2-digit",
    }).formatToParts(datetime)
    const year = parts.find(part => part.type === "year")!.value
    const month = parts.find(part => part.type === "month")!.value
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1]!
    return { year, month, monthName }
}

// Build blog posts
function buildPosts(): void {
    const files = collectMarkdownFiles(POSTS_DIR)
    const posts: Post[] = []

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

        const { year, month, monthName } = dateParts(datetime)
        const slug = slugify(title)

        // Strip scripts and unwrap noscript before markdown processing
        const body = preprocessMarkdown(rawBody)

        const description = summarizeForFeed(body)

        // Auto-generate preview for long posts (render first paragraph as HTML)
        const previewHtml = body.length > 1500
            ? rewriteLinks(marked.parse(body.split(/\n\s*\n/)[0] ?? "", { async: false }))
            : null

        // Convert full body from markdown to HTML, then fix internal links
        const bodyHtml = rewriteLinks(marked.parse(body, { async: false }))

        posts.push({ title, slug, datetime: datetime.toISOString(), year, month, monthName, image, description, preview: previewHtml, body: bodyHtml })
    }

    // Sort newest first
    posts.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

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
        lines.push(`        image: ${JSON.stringify(post.image)},`)
        lines.push(`        description: ${JSON.stringify(post.description)},`)
        lines.push(`        preview: ${post.preview ? JSON.stringify(post.preview) : "null"},`)
        lines.push(`        body: \`${escapeForTemplate(post.body)}\`,`)
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

        if (typeof attributes.title !== "string" || !attributes.title) {
            throw new Error(`Missing title in ${filepath}`)
        }

        const item: PortfolioItem = {
            title: attributes.title,
            subtitle: (attributes.subtitle as string) ?? "",
            slug,
            image: (attributes.image as string) ?? null,
            links: Object.fromEntries(
                Object.entries((attributes.links as Record<string, string>) ?? {})
                    .map(([label, url]) => [label, normalizePortfolioLink(url)]),
            ),
            body: rewriteLinks(marked.parse(body.trim(), { async: false })),
        }

        lines.push(`    {`)
        lines.push(`        title: ${JSON.stringify(item.title)},`)
        lines.push(`        subtitle: ${JSON.stringify(item.subtitle)},`)
        lines.push(`        slug: ${JSON.stringify(item.slug)},`)
        lines.push(`        image: ${JSON.stringify(item.image)},`)
        lines.push(`        links: ${JSON.stringify(item.links)},`)
        lines.push(`        body: \`${escapeForTemplate(item.body)}\`,`)
        lines.push(`    },`)
    }

    lines.push(`]\n`)

    writeFileSync(join(OUTPUT_DIR, "portfolio.ts"), lines.join("\n"))
    console.log(`Built ${slugOrder.length} portfolio items`)
}

// Strip XML-illegal control characters (U+0000-U+0008, U+000B, U+000C,
// U+000E-U+001F). These are forbidden per XML 1.0 §2.2 even inside CDATA,
// so a stray vertical tab or form feed in authored content would break feed
// validators. Kept as an explicit loop rather than a regex per project style.
function scrubXmlControlChars(text: string): string {
    let out = ""
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        const illegal = (code >= 0x00 && code <= 0x08)
            || code === 0x0B
            || code === 0x0C
            || (code >= 0x0E && code <= 0x1F)
        if (!illegal) out += text[i]
    }
    return out
}

// Generate RSS feed XML
function buildRssFeed(posts: Post[]): void {
    if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true })

    const feedUrl = "https://www.tinycranes.com/feed.xml"
    const managingEditor = "kfung@tinycranes.com (Kevin Fung)"

    const recentPosts = posts.slice(0, 20)
    // Pin lastBuildDate to the newest post so unrelated CI runs don't produce
    // phantom feed updates.
    const lastBuildDate = recentPosts[0]
        ? new Date(recentPosts[0].datetime).toUTCString()
        : new Date(0).toUTCString()

    const items = recentPosts.map(post => {
        // Trailing slash matches the SPA's canonical URL form, so feed-reader
        // clicks land on the canonical URL without a replaceState round-trip.
        const link = `https://www.tinycranes.com/blog/${post.year}/${post.month}/${post.slug}/`
        // Scrub XML-illegal control chars first, then split any literal `]]>`
        // since CDATA can't contain it directly.
        const body = scrubXmlControlChars(post.body).replaceAll("]]>", "]]]]><![CDATA[>")
        return [
            `        <item>`,
            `            <title>${escapeXml(post.title)}</title>`,
            `            <link>${link}</link>`,
            `            <guid isPermaLink="true">${link}</guid>`,
            `            <pubDate>${new Date(post.datetime).toUTCString()}</pubDate>`,
            `            <author>${escapeXml(managingEditor)}</author>`,
            `            <description>${escapeXml(scrubXmlControlChars(post.description))}</description>`,
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

function runAll(): void {
    buildPosts()
    buildPortfolio()
    copyStaticAssets()
}

if (process.argv.includes("--watch")) {
    // Skip initial build if another process already seeded the content modules
    // (e.g., via prestart). Keeps Parcel's first incremental from racing us.
    if (!existsSync(join(OUTPUT_DIR, "posts.ts"))) runAll()

    console.log(`Watching ${CONTENT_DIR} for .md changes...`)
    let pending: ReturnType<typeof setTimeout> | null = null
    watch(CONTENT_DIR, { recursive: true }, (event, filename) => {
        // Only markdown changes trigger a rebuild. Asset reads by
        // copyStaticAssets update atime on content files, which would
        // otherwise fire "change" events and loop forever.
        if (!filename || !filename.endsWith(".md")) return
        console.log(`[${event}] ${filename}`)
        // Editors fire multiple events per save; debounce briefly.
        if (pending) clearTimeout(pending)
        pending = setTimeout(() => {
            try {
                runAll()
                console.log("Rebuilt.")
            } catch (error) {
                console.error("Build failed:", error instanceof Error ? error.message : error)
            }
        }, 100)
    })
} else {
    runAll()
}
