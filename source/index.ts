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
// Meta callback receives route params, so post titles can be resolved from the slug.
function scrollRoute(
    component: m.Component,
    meta?: (args: Record<string, string>) => PageMeta,
): m.RouteResolver {
    return {
        onmatch(args: Record<string, string>) {
            // Preserve the browser's native anchor scroll on hash-targeted direct loads.
            if (!window.location.hash) window.scrollTo(0, 0)
            setPageMeta(meta ? meta(args) : {})
        },
        render(vnode) {
            return m(component, vnode.attrs)
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
