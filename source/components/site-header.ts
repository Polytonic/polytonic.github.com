import m from "mithril"
import { withBase } from "../with-base"
import * as styles from "../../styles/components/site-header.module.css"

const PRIMARY_LINKS = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog/" },
    { label: "Portfolio", href: "/portfolio/" },
]

// True when the active route matches link.href as a route prefix. The Home
// link only matches the exact root so it doesn't claim aria-current="page"
// on every other route.
function isCurrent(href: string): boolean {
    const route = m.route.get() || "/"
    if (href === "/") return route === "/"
    return route === href || route.startsWith(href)
}

// Header with responsive behavior:
// Mobile (<568px): dark bar with logotype
// Desktop (>=568px): light bar with nav links
export const SiteHeader: m.Component = {
    view() {
        return m("header", { class: styles.navbar, "data-navbar": true }, [

            // Mobile: logotype. The brand is site chrome, not a document
            // heading, so it's a <p> rather than an <h1>. That keeps each
            // page's own h1 (post title, archive, etc.) as the top of its
            // outline without fighting the site identity wordmark.
            m("div", { class: styles.logotype },
                m("p", m(m.route.Link, { href: "/" }, "TinyCranes")),
            ),

            // Desktop: nav links
            m("div", { class: styles.container }, [
                m("nav", { class: styles.left, "aria-label": "Primary" },
                    PRIMARY_LINKS.map(link =>
                        m(m.route.Link, {
                            href: link.href,
                            class: "cutout",
                            "aria-current": isCurrent(link.href) ? "page" : undefined,
                        }, link.label),
                    ),
                ),
                m("aside", { class: styles.right }, [
                    m("a", { href: withBase("/feed.xml"), class: "cutout" }, "RSS"),
                ]),
            ]),
        ])
    },
}
