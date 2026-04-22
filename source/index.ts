import m from "mithril"
import { HomeView } from "./views/home/home-view"
import { BlogListView } from "./views/blog/blog-list-view"
import { BlogPostView } from "./views/blog/blog-post-view"
import { BlogArchiveView } from "./views/blog/blog-archive-view"
import { BlogFilteredView } from "./views/blog/blog-filtered-view"
import { PortfolioView } from "./views/portfolio/portfolio-view"
import { NotFoundView } from "./views/not-found-view"
import { posts } from "./content/posts"

// Use clean URLs (no hash prefix)
m.route.prefix = ""

// Normalize trailing slashes: redirect /blog/ to /blog, etc.
// Preserves compatibility with old-style URLs.
const currentPath = window.location.pathname
if (currentPath.length > 1 && currentPath.endsWith("/")) {
    const normalized = currentPath.slice(0, -1) + window.location.search + window.location.hash
    window.history.replaceState(null, "", normalized)
}

const root = document.getElementById("app")!

// Intercept clicks on plain same-origin anchors so the SPA handles internal
// navigation without a full page reload. m.route.Link already does this for
// vnodes we generate, but author-authored HTML rendered via m.trust emits
// plain <a> tags that would otherwise trigger native navigation through the
// GH Pages 404-as-index-html fallback.
function isInternalSPAPath(path: string): boolean {
    // SPA routes have no file extension and are under /, /blog, or /portfolio.
    // Standalone pages like /portfolio/fidelis/index.html and static assets
    // (/portfolio/assets/foo.png, /uploads/bar.png) must pass through.
    if (path === "/" || path === "/portfolio") return true
    if (!path.startsWith("/blog")) return false
    if (/\.[a-z0-9]{1,5}$/i.test(path)) return false
    // Only /blog, /blog/archive, /blog/latest, /blog/YYYY[/MM[/slug]]
    return /^\/blog(?:$|\/archive$|\/latest$|\/\d{4}(?:\/\d{2}(?:\/[a-z0-9-]+)?)?$)/.test(path)
}

document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    let node: HTMLElement | null = event.target as HTMLElement | null
    while (node && node.tagName !== "A") node = node.parentElement
    if (!node) return
    const anchor = node as HTMLAnchorElement

    if (anchor.target && anchor.target !== "_self") return
    if (anchor.hasAttribute("download")) return

    const raw = anchor.getAttribute("href")
    if (!raw) return
    if (raw.startsWith("#")) return // native in-page anchor scroll

    // Use the anchor's resolved URL to uniformly handle relative and absolute hrefs.
    const url = new URL(anchor.href)
    if (url.origin !== window.location.origin) return
    if (!isInternalSPAPath(url.pathname)) return

    event.preventDefault()
    m.route.set(url.pathname + url.search + url.hash)
})

// Per-route document metadata
interface PageMeta {
    title?: string        // Route-specific title segment; joined as "{title} \u2022 TinyCranes"
    description?: string  // Meta description for this route
}

const DEFAULT_DESCRIPTION = "Software design and development. I build things."

function setPageMeta(info: PageMeta): void {
    const fullTitle = info.title ? `${info.title} \u2022 TinyCranes` : "TinyCranes"
    const description = info.description ?? DEFAULT_DESCRIPTION
    const canonical = `https://www.tinycranes.com${window.location.pathname}`

    document.title = fullTitle

    const pairs: Array<[string, string]> = [
        ['meta[name="description"]', description],
        ['meta[property="og:title"]', fullTitle],
        ['meta[property="og:description"]', description],
        ['meta[property="og:url"]', canonical],
        ['meta[name="twitter:title"]', fullTitle],
        ['meta[name="twitter:description"]', description],
    ]
    for (const [selector, content] of pairs) {
        document.querySelector(selector)?.setAttribute("content", content)
    }
}

// Route resolver that updates the scroll position and page metadata on match.
// Meta callback receives route params so post titles can be resolved from the slug.
// Generic over attrs so the route table preserves typed params end-to-end.
// Returning the component from onmatch lets Mithril mount it directly with the
// route params as attrs, avoiding a manual m(component, vnode.attrs) call whose
// inference breaks under generics.
function scrollRoute<A>(
    component: m.ComponentTypes<A>,
    meta?: (args: A) => PageMeta,
): m.RouteResolver<A> {
    return {
        onmatch(args: A) {
            if (!window.location.hash) window.scrollTo(0, 0)
            setPageMeta(meta ? meta(args) : {})
            return component
        },
    }
}

m.route(root, "/", {
    "/":                          scrollRoute(HomeView),
    "/blog":                      scrollRoute(BlogListView,    ()                    => ({ title: "Blog" })),
    "/blog/archive":              scrollRoute(BlogArchiveView, ()                    => ({ title: "Archive" })),
    "/blog/latest": {
        // Preserve the old /blog/latest redirect behavior: bounce to the newest post.
        onmatch() {
            const latest = posts[0]
            const target = latest
                ? `/blog/${latest.year}/${latest.month}/${latest.slug}`
                : "/blog"
            m.route.set(target, null, { replace: true })
        },
    },
    "/blog/:year":                scrollRoute(BlogFilteredView, ({ year })           => ({ title: `${year} Archive` })),
    "/blog/:year/:month":         scrollRoute(BlogFilteredView, ({ year, month })    => ({ title: `${year}/${month} Archive` })),
    "/blog/:year/:month/:slug":   scrollRoute(BlogPostView,     ({ year, month, slug }) => {
        const post = posts.find(p => p.year === year && p.month === month && p.slug === slug)
        return post
            ? { title: post.title, description: post.description }
            : { title: "Post not found" }
    }),
    "/portfolio":                 scrollRoute(PortfolioView, () => ({ title: "Portfolio" })),
    "/:path...":                  scrollRoute(NotFoundView,  () => ({ title: "Page not found" })),
})
