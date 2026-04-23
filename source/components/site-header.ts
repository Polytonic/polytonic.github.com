import m from "mithril"
import * as styles from "../../styles/components/site-header.module.css"

// Header with responsive behavior:
// Mobile (<568px): dark bar with logotype
// Desktop (>=568px): light bar with nav links
export const SiteHeader: m.Component = {
    view() {
        return m("header", { class: styles.navbar, "data-navbar": true }, [

            // Mobile: logotype
            m("div", { class: styles.logotype },
                m("h1", m(m.route.Link, { href: "/" }, "TinyCranes")),
            ),

            // Desktop: nav links
            m("div", { class: styles.container }, [
                m("nav", { class: styles.left }, [
                    m(m.route.Link, { href: "/", class: "cutout" }, "Home"),
                    m(m.route.Link, { href: "/blog/", class: "cutout" }, "Blog"),
                    m(m.route.Link, { href: "/portfolio/", class: "cutout" }, "Portfolio"),
                ]),
                m("aside", { class: styles.right }, [
                    m("a", { href: "/feed.xml", class: "cutout" }, "RSS"),
                ]),
            ]),
        ])
    },
}
