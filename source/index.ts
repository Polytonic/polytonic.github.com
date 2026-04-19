import m from "mithril"
import { HomeView } from "./views/home/home-view"
import { BlogListView } from "./views/blog/blog-list-view"
import { BlogPostView } from "./views/blog/blog-post-view"
import { BlogArchiveView } from "./views/blog/blog-archive-view"
import { BlogFilteredView } from "./views/blog/blog-filtered-view"
import { PortfolioView } from "./views/portfolio/portfolio-view"
import { NotFoundView } from "./views/not-found-view"

// Use clean URLs (no hash prefix)
m.route.prefix = ""

// Normalize trailing slashes: redirect /blog/ to /blog, etc.
// This preserves compatibility with old-style URLs
const currentPath = window.location.pathname
if (currentPath.length > 1 && currentPath.endsWith("/")) {
    window.history.replaceState(null, "", currentPath.slice(0, -1) + window.location.hash)
}

// Inject RSS autodiscovery link
const rssLink = document.createElement("link")
rssLink.rel = "alternate"
rssLink.type = "application/rss+xml"
rssLink.title = "TinyCranes RSS"
rssLink.href = "/feed.xml"
document.head.appendChild(rssLink)

const root = document.getElementById("app")!

// Wrapper that scrolls to top on navigation
function scrollRoute(component: m.Component): m.RouteResolver {
    return {
        onmatch() {
            window.scrollTo(0, 0)
            document.title = "TinyCranes"
        },
        render(vnode) {
            return m(component, vnode.attrs)
        },
    }
}

m.route(root, "/", {
    "/":                          scrollRoute(HomeView),
    "/blog":                      scrollRoute(BlogListView),
    "/blog/archive":              scrollRoute(BlogArchiveView),
    "/blog/:year":                scrollRoute(BlogFilteredView),
    "/blog/:year/:month":         scrollRoute(BlogFilteredView),
    "/blog/:year/:month/:slug":   scrollRoute(BlogPostView),
    "/portfolio":                 scrollRoute(PortfolioView),
    "/:path...":                  scrollRoute(NotFoundView),
})
