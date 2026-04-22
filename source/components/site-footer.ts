import m from "mithril"
import * as styles from "../../styles/components/site-footer.module.css"

interface SiteFooterAttrs {
    // URL for the "Latest" nav link. Defaults to /blog if absent (e.g., no posts).
    latestUrl?: string
}

export const SiteFooter: m.Component<SiteFooterAttrs> = {
    view(vnode) {
        const latestUrl = vnode.attrs.latestUrl ?? "/blog"

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
