import m from "mithril"
import { posts } from "../content/posts"
import * as styles from "../../styles/components/site-footer.module.css"

export const SiteFooter: m.Component = {
    view() {
        // Link to the most recent post
        const latest = posts[0]
        const latestUrl = latest
            ? `/blog/${latest.year}/${latest.month}/${latest.slug}`
            : "/blog"

        return m("footer", { class: styles.footer }, [
            m("nav", [
                m("ul", [
                    m("li", m(m.route.Link, { href: "/blog/archive" }, "Archive")),
                    m("li", m(m.route.Link, { href: latestUrl }, "Latest")),
                    m("li", m("a", { href: "/feed.xml" }, "RSS")),
                ]),
            ]),
            m("aside", [
                m("p", `\u00A9 ${new Date().getFullYear()} Kevin Fung`),
                m("p", "Handcrafted in Washington D.C."),
            ]),
        ])
    },
}
