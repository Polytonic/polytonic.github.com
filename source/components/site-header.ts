import m from "mithril"
import { withBase } from "../with-base"
import * as styles from "../../styles/components/site-header.module.css"

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
                m("nav", { class: styles.left }, [
                    m(m.route.Link, { href: "/", class: "cutout" }, "Home"),
                    m(m.route.Link, { href: "/blog/", class: "cutout" }, "Blog"),
                    m(m.route.Link, { href: "/portfolio/", class: "cutout" }, "Portfolio"),
                ]),
                m("aside", { class: styles.right }, [
                    m("a", { href: withBase("/feed.xml"), class: "cutout" }, "RSS"),
                ]),
            ]),
        ])
    },
}
