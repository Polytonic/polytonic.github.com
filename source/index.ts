import m from "mithril"
// Syntax highlighting theme. Tokenization happens at build time in
// scripts/build-content.ts; this stylesheet provides the colors for the
// class-based output (a11y-dark).
import "highlight.js/styles/a11y-dark.css"
import { HomeView } from "./views/home/home-view"
import { BlogListView } from "./views/blog/blog-list-view"
import { BlogPostView } from "./views/blog/blog-post-view"
import { BlogArchiveView } from "./views/blog/blog-archive-view"
import { BlogFilteredView } from "./views/blog/blog-filtered-view"
import { PortfolioView } from "./views/portfolio/portfolio-view"
import { NotFoundView } from "./views/not-found-view"
import { posts } from "./content/posts"
import { latestPostUrl } from "./content/queries"

// Use clean URLs (no hash prefix)
m.route.prefix = ""

// Canonical URL form is trailing-slash (matches the pre-migration site and the
// RSS feed's <link>/<guid>). Paths without a slash get one here on boot so
// bookmarks + external links keep working; all internally-generated hrefs
// include the slash to begin with.
const currentPath = window.location.pathname
if (currentPath !== "/" && !currentPath.endsWith("/")) {
    const normalized = currentPath + "/" + window.location.search + window.location.hash
    window.history.replaceState(null, "", normalized)
}

const root = document.getElementById("app")!

// Normalize a path so it ends in "/" (root excluded). Used by the click
// interceptor before handing a URL to m.route.set so href values in
// author-authored markdown that omit the trailing slash still route.
function canonicalPath(path: string): string {
    return path === "/" || path.endsWith("/") ? path : path + "/"
}

// String-method file-extension check (no regex per project style).
function hasFileExtension(path: string): boolean {
    const lastSlash = path.lastIndexOf("/")
    const lastDot = path.lastIndexOf(".")
    return lastDot > lastSlash
}

// Does this path correspond to a Mithril SPA route (vs a standalone static
// page like /portfolio/fidelis/ or an asset like /portfolio/assets/foo.png)?
// SPA routes: /, /portfolio/, and any /blog/... that isn't a file. Paths
// under /portfolio/<slug>/ are legacy Twine/Unity bundles and must pass
// through to the browser.
function isInternalSPAPath(path: string): boolean {
    const normalized = canonicalPath(path)
    if (normalized === "/" || normalized === "/portfolio/") return true
    if (!normalized.startsWith("/blog/")) return false
    return !hasFileExtension(normalized)
}

// Intercept clicks on plain same-origin anchors so the SPA handles internal
// navigation without a full page reload. m.route.Link already does this for
// vnodes we generate, but author-authored HTML rendered via m.trust emits
// plain <a> tags that would otherwise trigger native navigation through the
// GH Pages 404-as-index-html fallback.
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
    m.route.set(canonicalPath(url.pathname) + url.search + url.hash)
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

// Route patterns end in "/" to match the canonicalized URL form.
m.route(root, "/", {
    "/":                           scrollRoute(HomeView),
    "/blog/":                      scrollRoute(BlogListView,    ()                      => ({ title: "Blog" })),
    "/blog/archive/":              scrollRoute(BlogArchiveView, ()                      => ({ title: "Archive" })),
    "/blog/latest/": {
        // Preserve the old /blog/latest redirect behavior: bounce to the newest post.
        onmatch() {
            m.route.set(latestPostUrl(), null, { replace: true })
        },
    },
    "/blog/:year/":                scrollRoute(BlogFilteredView, ({ year })             => ({ title: `${year} Archive` })),
    "/blog/:year/:month/":         scrollRoute(BlogFilteredView, ({ year, month })      => ({ title: `${year}/${month} Archive` })),
    "/blog/:year/:month/:slug/":   scrollRoute(BlogPostView,     ({ year, month, slug }) => {
        const post = posts.find(entry => entry.year === year && entry.month === month && entry.slug === slug)
        return post
            ? { title: post.title, description: post.description }
            : { title: "Post not found" }
    }),
    "/portfolio/":                 scrollRoute(PortfolioView, () => ({ title: "Portfolio" })),
    "/:path...":                   scrollRoute(NotFoundView,  () => ({ title: "Page not found" })),
})
